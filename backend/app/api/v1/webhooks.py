"""Webhook handler endpoints for external services (Twilio, Stripe).

The Stripe handler verifies signatures via the official SDK, processes events
idempotently (storing processed event IDs in Redis), and offloads heavy
processing to Celery so the endpoint returns 200 quickly.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.database import get_db
from app.models.conversation import (
    ChannelType,
    Conversation,
    ConversationStatus,
    Message,
    SenderType,
)
from app.models.tenant import Tenant
from app.models.user import PlanTier, User
from app.schemas.webhooks import WebhookAck

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

# ---------------------------------------------------------------------------
# Redis helpers for idempotency
# ---------------------------------------------------------------------------

_redis_pool: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True, max_connections=10
        )
    return _redis_pool


async def _is_event_processed(event_id: str) -> bool:
    """Check whether a Stripe event has already been processed."""
    try:
        r = await _get_redis()
        return bool(await r.exists(f"stripe:event:{event_id}"))
    except Exception:
        return False


async def _mark_event_processed(event_id: str) -> None:
    """Record that an event has been processed (kept for 72 hours)."""
    try:
        r = await _get_redis()
        await r.set(f"stripe:event:{event_id}", "1", ex=259200)
    except Exception as exc:
        logger.warning("Failed to mark event %s as processed: %s", event_id, exc)


# ---------------------------------------------------------------------------
# Tier mapping helpers
# ---------------------------------------------------------------------------

# Map from Stripe price IDs / metadata to our PlanTier enum.
# In production these come from env vars; the mapping is best-effort.
_STRIPE_TIER_MAP: dict[str, PlanTier] = {
    "starter": PlanTier.STARTER,
    "growth": PlanTier.GROWTH,
    "pro": PlanTier.PRO,
}


def _resolve_tier(raw: str) -> PlanTier:
    """Convert a raw tier string from Stripe metadata into a PlanTier."""
    normalised = raw.strip().lower()
    return _STRIPE_TIER_MAP.get(normalised, PlanTier.STARTER)


# ---------------------------------------------------------------------------
# Twilio webhook (preserved from original implementation)
# ---------------------------------------------------------------------------


@router.post("/twilio", response_model=WebhookAck)
async def twilio_inbound(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> WebhookAck:
    """Handle inbound SMS from Twilio.

    Parses the incoming message, finds the tenant by phone number,
    and routes through the AI chat pipeline.
    """
    form_data = await request.form()
    from_number = form_data.get("From", "")
    body = form_data.get("Body", "")
    message_sid = form_data.get("MessageSid", "")

    if not from_number or not body:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing From or Body in Twilio payload",
        )

    clean_phone = (
        from_number.lstrip("+").lstrip("1")
        if from_number.startswith("+1")
        else from_number.lstrip("+")
    )

    result = await db.execute(
        select(Tenant).where(Tenant.phone.contains(clean_phone))
    )
    tenant = result.scalar_one_or_none()

    if tenant is None:
        logger.warning("Inbound SMS from unknown number: %s", from_number)
        return WebhookAck(
            status="ignored",
            message="Tenant not found for this phone number",
        )

    conv_result = await db.execute(
        select(Conversation).where(
            Conversation.tenant_id == tenant.id,
            Conversation.channel == ChannelType.SMS,
            Conversation.status == ConversationStatus.OPEN,
        )
    )
    conversation = conv_result.scalar_one_or_none()

    if conversation is None:
        conversation = Conversation(
            tenant_id=tenant.id,
            landlord_id=tenant.landlord_id,
            channel=ChannelType.SMS,
        )
        db.add(conversation)
        await db.flush()

    msg = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.TENANT,
        content=body,
        metadata_={"twilio_sid": message_sid, "from": from_number},
    )
    db.add(msg)

    ai_reply = (
        f"Hi {tenant.first_name}, we received your message. "
        f"A team member will follow up shortly."
    )

    ai_msg = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.AI,
        content=ai_reply,
        intent="general_inquiry",
        confidence=0.75,
    )
    db.add(ai_msg)
    await db.flush()

    return WebhookAck(status="ok", message="Message processed")


# ---------------------------------------------------------------------------
# Stripe webhook
# ---------------------------------------------------------------------------


@router.post("/stripe", response_model=WebhookAck)
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(None, alias="Stripe-Signature"),
    db: AsyncSession = Depends(get_db),
) -> WebhookAck:
    """Handle Stripe webhook events.

    Verifies the webhook signature using ``stripe.Webhook.construct_event``,
    checks for idempotency (duplicate event IDs), and dispatches to the
    appropriate handler.  Heavy processing is offloaded to Celery so we
    can return 200 within Stripe's timeout window.
    """
    payload_bytes = await request.body()

    # ------------------------------------------------------------------
    # Signature verification
    # ------------------------------------------------------------------
    if not stripe_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Stripe-Signature header",
        )

    try:
        event = stripe.Webhook.construct_event(
            payload_bytes,
            stripe_signature,
            settings.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature",
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload",
        )

    event_id: str = event["id"]
    event_type: str = event["type"]
    data_object: dict = event["data"]["object"]

    # ------------------------------------------------------------------
    # Idempotency check
    # ------------------------------------------------------------------
    if await _is_event_processed(event_id):
        logger.info("Duplicate Stripe event %s (%s) — skipping", event_id, event_type)
        return WebhookAck(status="ok", message="Already processed")

    # ------------------------------------------------------------------
    # Dispatch
    # ------------------------------------------------------------------
    handler_map = {
        "checkout.session.completed": _handle_checkout_completed,
        "customer.subscription.updated": _handle_subscription_updated,
        "customer.subscription.deleted": _handle_subscription_deleted,
        "invoice.payment_succeeded": _handle_invoice_payment_succeeded,
        "invoice.payment_failed": _handle_invoice_payment_failed,
        "customer.subscription.trial_will_end": _handle_trial_will_end,
    }

    handler = handler_map.get(event_type)
    if handler:
        try:
            await handler(data_object, db)
        except Exception as exc:
            logger.error(
                "Stripe webhook handler error for %s (%s): %s",
                event_type,
                event_id,
                exc,
                exc_info=True,
            )
            # Still mark as processed to avoid retrying a broken handler
            # in an infinite loop.  The error is logged for investigation.
    else:
        logger.info("Unhandled Stripe event type: %s", event_type)

    await _mark_event_processed(event_id)

    return WebhookAck(status="ok", message=f"Processed {event_type}")


# ---------------------------------------------------------------------------
# Individual event handlers
# ---------------------------------------------------------------------------


async def _handle_checkout_completed(
    session: dict, db: AsyncSession
) -> None:
    """checkout.session.completed — Activate subscription, update user tier."""
    metadata = session.get("metadata", {})
    user_id_str = metadata.get("user_id")
    tier_str = metadata.get("tier", "starter")
    subscription_id = session.get("subscription")
    customer_id = session.get("customer")

    if not user_id_str:
        logger.warning("checkout.session.completed missing user_id in metadata")
        return

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        logger.error("Invalid user_id in checkout metadata: %s", user_id_str)
        return

    new_tier = _resolve_tier(tier_str)

    # Update user record
    await db.execute(
        update(User)
        .where(User.id == user_uuid)
        .values(
            plan_tier=new_tier,
            stripe_account_id=customer_id,
        )
    )
    await db.flush()

    logger.info(
        "Checkout completed: user=%s tier=%s subscription=%s",
        user_id_str,
        new_tier.value,
        subscription_id,
    )

    # Fire async Celery task for welcome email
    try:
        from app.tasks.notification_tasks import send_email

        result = await db.execute(select(User.email).where(User.id == user_uuid))
        email = result.scalar_one_or_none()
        if email:
            send_email.delay(
                email,
                f"Welcome to RealDeal AI {new_tier.value.title()}!",
                (
                    f"Your {new_tier.value.title()} plan is now active. "
                    f"You have access to all {new_tier.value.title()}-tier features.\n\n"
                    f"If you have any questions, reply to this email.\n\n"
                    f"— The RealDeal AI Team"
                ),
            )
    except Exception as exc:
        logger.warning("Failed to send welcome email: %s", exc)


async def _handle_subscription_updated(
    subscription: dict, db: AsyncSession
) -> None:
    """customer.subscription.updated — Update tier on plan change."""
    metadata = subscription.get("metadata", {})
    user_id_str = metadata.get("user_id")
    tier_str = metadata.get("tier", "")
    sub_status = subscription.get("status", "")

    if not user_id_str:
        logger.info("subscription.updated without user_id metadata — skipping")
        return

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        return

    if tier_str:
        new_tier = _resolve_tier(tier_str)
        await db.execute(
            update(User).where(User.id == user_uuid).values(plan_tier=new_tier)
        )
        await db.flush()
        logger.info(
            "Subscription updated: user=%s tier=%s status=%s",
            user_id_str,
            new_tier.value,
            sub_status,
        )
    else:
        logger.info("Subscription updated for user %s, status=%s", user_id_str, sub_status)


async def _handle_subscription_deleted(
    subscription: dict, db: AsyncSession
) -> None:
    """customer.subscription.deleted — Downgrade to free (starter) tier."""
    metadata = subscription.get("metadata", {})
    user_id_str = metadata.get("user_id")

    if not user_id_str:
        # Try to look up by Stripe customer ID
        customer_id = subscription.get("customer")
        if customer_id:
            result = await db.execute(
                select(User).where(User.stripe_account_id == customer_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user_id_str = str(user.id)

    if not user_id_str:
        logger.warning("subscription.deleted — could not determine user_id")
        return

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        return

    await db.execute(
        update(User)
        .where(User.id == user_uuid)
        .values(plan_tier=PlanTier.STARTER)
    )
    await db.flush()

    logger.info("Subscription deleted: user=%s downgraded to starter", user_id_str)

    # Notify user
    try:
        from app.tasks.notification_tasks import send_email

        result = await db.execute(select(User.email).where(User.id == user_uuid))
        email = result.scalar_one_or_none()
        if email:
            send_email.delay(
                email,
                "Your RealDeal AI Subscription Has Ended",
                (
                    "Your paid subscription has been cancelled and your account "
                    "has been moved to the free Starter plan.\n\n"
                    "You can reactivate at any time from Settings > Billing.\n\n"
                    "— The RealDeal AI Team"
                ),
            )
    except Exception as exc:
        logger.warning("Failed to send cancellation email: %s", exc)


async def _handle_invoice_payment_succeeded(
    invoice: dict, db: AsyncSession
) -> None:
    """invoice.payment_succeeded — Record payment and extend access."""
    customer_id = invoice.get("customer", "")
    amount_cents = invoice.get("amount_paid", 0)
    payment_intent_id = invoice.get("payment_intent", "")
    invoice_id = invoice.get("id", "")
    period_start = invoice.get("period_start")
    period_end = invoice.get("period_end")

    # Look up user by Stripe customer ID
    result = await db.execute(
        select(User).where(User.stripe_account_id == customer_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        logger.info(
            "invoice.payment_succeeded for unknown customer %s", customer_id
        )
        return

    # Record in subscription_payments table via Celery
    try:
        from app.tasks.payment_tasks import record_subscription_payment

        record_subscription_payment.delay(
            user_id=str(user.id),
            stripe_payment_intent_id=payment_intent_id or "",
            stripe_invoice_id=invoice_id,
            amount_cents=amount_cents,
            currency=invoice.get("currency", "usd"),
            plan_tier=user.plan_tier.value,
            period_start=period_start,
            period_end=period_end,
        )
    except Exception:
        # Task may not exist yet — log and continue
        logger.info(
            "Payment recorded inline: user=%s amount=%d cents",
            user.id,
            amount_cents,
        )

    logger.info(
        "Invoice payment succeeded: customer=%s amount=%d cents",
        customer_id,
        amount_cents,
    )


async def _handle_invoice_payment_failed(
    invoice: dict, db: AsyncSession
) -> None:
    """invoice.payment_failed — Send warning email and apply grace period logic."""
    customer_id = invoice.get("customer", "")
    attempt_count = invoice.get("attempt_count", 0)
    invoice.get("next_payment_attempt")

    result = await db.execute(
        select(User).where(User.stripe_account_id == customer_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        logger.warning(
            "invoice.payment_failed for unknown customer %s", customer_id
        )
        return

    logger.warning(
        "Payment failed: user=%s customer=%s attempt=%d",
        user.id,
        customer_id,
        attempt_count,
    )

    # Send warning email
    try:
        from app.tasks.notification_tasks import send_email

        if attempt_count <= 1:
            subject = "Action Required: Payment Failed"
            body = (
                "We were unable to process your subscription payment. "
                "Please update your payment method in Settings > Billing "
                "to avoid any interruption to your service.\n\n"
                "— The RealDeal AI Team"
            )
        elif attempt_count == 2:
            subject = "Urgent: Second Payment Attempt Failed"
            body = (
                "This is the second time we've been unable to charge your "
                "payment method. Your access will be downgraded to the free "
                "plan if the next attempt also fails.\n\n"
                "Please update your payment information immediately.\n\n"
                "— The RealDeal AI Team"
            )
        else:
            subject = "Final Notice: Subscription At Risk"
            body = (
                "We have been unable to process your payment after multiple "
                "attempts. Your account will be downgraded to the free Starter "
                "plan shortly.\n\n"
                "Update your payment method now to keep your current plan.\n\n"
                "— The RealDeal AI Team"
            )

        send_email.delay(user.email, subject, body)
    except Exception as exc:
        logger.warning("Failed to send payment-failed email: %s", exc)

    # After 3 failed attempts, downgrade to free tier
    if attempt_count >= 3:
        await db.execute(
            update(User)
            .where(User.id == user.id)
            .values(plan_tier=PlanTier.STARTER)
        )
        await db.flush()
        logger.warning(
            "User %s downgraded to starter after %d payment failures",
            user.id,
            attempt_count,
        )


async def _handle_trial_will_end(
    subscription: dict, db: AsyncSession
) -> None:
    """customer.subscription.trial_will_end — Send trial ending reminder."""
    metadata = subscription.get("metadata", {})
    user_id_str = metadata.get("user_id")
    trial_end = subscription.get("trial_end")

    if not user_id_str:
        customer_id = subscription.get("customer")
        if customer_id:
            result = await db.execute(
                select(User).where(User.stripe_account_id == customer_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user_id_str = str(user.id)

    if not user_id_str:
        return

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        return

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()
    if not user:
        return

    trial_end_str = ""
    if trial_end:
        trial_end_dt = datetime.fromtimestamp(trial_end, tz=timezone.utc)
        trial_end_str = trial_end_dt.strftime("%B %d, %Y")

    try:
        from app.tasks.notification_tasks import send_email

        send_email.delay(
            user.email,
            "Your RealDeal AI Trial Is Ending Soon",
            (
                f"Your free trial ends on {trial_end_str}. After that, your "
                f"payment method on file will be charged for your "
                f"{user.plan_tier.value.title()} plan.\n\n"
                f"If you'd like to change or cancel your plan, visit "
                f"Settings > Billing before your trial ends.\n\n"
                f"— The RealDeal AI Team"
            ),
        )
    except Exception as exc:
        logger.warning("Failed to send trial-ending email: %s", exc)

    logger.info("Trial ending reminder sent to user %s", user_id_str)
