"""Billing API endpoints for subscription management via Stripe.

Provides checkout session creation, customer portal access, subscription
details, invoice history, cancellation, and reactivation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/billing", tags=["billing"])

stripe.api_key = settings.STRIPE_SECRET_KEY

# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class CheckoutRequest(BaseModel):
    plan_tier: str = Field(..., description="Target plan: starter, growth, or pro")
    billing_period: str = Field("monthly", description="'monthly' or 'yearly'")
    success_url: str | None = None
    cancel_url: str | None = None


class CheckoutResponse(BaseModel):
    session_id: str
    checkout_url: str


class PortalRequest(BaseModel):
    return_url: str | None = None


class PortalResponse(BaseModel):
    portal_url: str


class SubscriptionResponse(BaseModel):
    tier: str
    status: str
    is_trial: bool
    trial_end: str | None = None
    current_period_start: str | None = None
    current_period_end: str | None = None
    cancel_at_period_end: bool
    payment_method_last4: str | None = None
    payment_method_brand: str | None = None
    monthly_amount: float | None = None
    currency: str = "usd"


class InvoiceItem(BaseModel):
    id: str
    date: str
    amount: float
    currency: str
    status: str
    pdf_url: str | None = None
    hosted_url: str | None = None


class CancelResponse(BaseModel):
    status: str
    cancel_at_period_end: bool
    current_period_end: str | None = None
    message: str


class ReactivateResponse(BaseModel):
    status: str
    tier: str
    message: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

APP_URL = (
    settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else "https://app.realdeal.ai"
)

_TIER_PRICE_MAP: dict[str, dict[str, str]] = {
    "starter": {
        "monthly": "price_starter_monthly",
        "yearly": "price_starter_yearly",
    },
    "growth": {
        "monthly": "price_growth_monthly",
        "yearly": "price_growth_yearly",
    },
    "pro": {
        "monthly": "price_pro_monthly",
        "yearly": "price_pro_yearly",
    },
}


async def _get_or_create_stripe_customer(user: User) -> str:
    """Ensure the user has a Stripe customer ID; create one if needed."""
    if user.stripe_account_id:
        return user.stripe_account_id

    customer = stripe.Customer.create(
        email=user.email,
        name=user.full_name,
        metadata={"user_id": str(user.id)},
    )
    # The caller is responsible for persisting this via the DB session
    return customer.id


async def _get_active_subscription(customer_id: str) -> stripe.Subscription | None:
    """Retrieve the user's active Stripe subscription, if any."""
    subs = stripe.Subscription.list(customer=customer_id, status="all", limit=1)
    for sub in subs.auto_paging_iter():
        if sub.status in ("active", "trialing", "past_due"):
            return sub
    return None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CheckoutResponse:
    """Create a Stripe Checkout Session for upgrading to a paid plan."""
    tier = payload.plan_tier.lower()
    period = payload.billing_period.lower()

    if tier not in _TIER_PRICE_MAP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan tier: {tier}. Must be one of: {list(_TIER_PRICE_MAP.keys())}",
        )
    if period not in ("monthly", "yearly"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="billing_period must be 'monthly' or 'yearly'",
        )

    price_id = _TIER_PRICE_MAP[tier][period]

    try:
        customer_id = await _get_or_create_stripe_customer(current_user)

        # Persist customer ID if it was newly created
        if customer_id != current_user.stripe_account_id:
            await db.execute(
                update(User)
                .where(User.id == current_user.id)
                .values(stripe_account_id=customer_id)
            )
            await db.flush()

        success = (
            payload.success_url
            or f"{APP_URL}/settings/billing?session_id={{CHECKOUT_SESSION_ID}}"
        )
        cancel = payload.cancel_url or f"{APP_URL}/pricing"

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=success,
            cancel_url=cancel,
            metadata={
                "user_id": str(current_user.id),
                "tier": tier,
                "billing_period": period,
            },
            allow_promotion_codes=True,
            billing_address_collection="required",
            subscription_data={
                "metadata": {
                    "user_id": str(current_user.id),
                    "tier": tier,
                },
                "trial_period_days": 7 if tier != "starter" else None,
            },
        )

        logger.info(
            "Checkout session created for user %s, tier=%s period=%s",
            current_user.id,
            tier,
            period,
        )

        return CheckoutResponse(session_id=session.id, checkout_url=session.url)

    except stripe.error.StripeError as exc:
        logger.error("Stripe checkout creation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error. Please try again.",
        )


@router.post("/portal", response_model=PortalResponse)
async def create_portal_session(
    payload: PortalRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PortalResponse:
    """Create a Stripe Customer Portal session for managing billing."""
    if not current_user.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found. Subscribe to a plan first.",
        )

    try:
        return_url = payload.return_url or f"{APP_URL}/settings/billing"
        session = stripe.billing_portal.Session.create(
            customer=current_user.stripe_account_id,
            return_url=return_url,
        )
        return PortalResponse(portal_url=session.url)

    except stripe.error.StripeError as exc:
        logger.error("Stripe portal creation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment provider error. Please try again.",
        )


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    """Get the current user's subscription details from Stripe."""
    if not current_user.stripe_account_id:
        return SubscriptionResponse(
            tier=current_user.plan_tier.value,
            status="active",
            is_trial=False,
            cancel_at_period_end=False,
            monthly_amount=0,
        )

    try:
        sub = await _get_active_subscription(current_user.stripe_account_id)

        if not sub:
            return SubscriptionResponse(
                tier=current_user.plan_tier.value,
                status="inactive",
                is_trial=False,
                cancel_at_period_end=False,
                monthly_amount=0,
            )

        # Extract payment method info
        pm_last4: str | None = None
        pm_brand: str | None = None
        if sub.default_payment_method:
            try:
                pm = stripe.PaymentMethod.retrieve(sub.default_payment_method)
                if pm.card:
                    pm_last4 = pm.card.last4
                    pm_brand = pm.card.brand
            except Exception:
                pass

        # Monthly amount
        amount = 0.0
        if sub.items and sub.items.data:
            price = sub.items.data[0].price
            if price.recurring and price.recurring.interval == "year":
                amount = (price.unit_amount or 0) / 100 / 12
            else:
                amount = (price.unit_amount or 0) / 100

        return SubscriptionResponse(
            tier=sub.metadata.get("tier", current_user.plan_tier.value),
            status=sub.status,
            is_trial=sub.status == "trialing",
            trial_end=(
                datetime.fromtimestamp(sub.trial_end, tz=timezone.utc).isoformat()
                if sub.trial_end
                else None
            ),
            current_period_start=datetime.fromtimestamp(
                sub.current_period_start, tz=timezone.utc
            ).isoformat(),
            current_period_end=datetime.fromtimestamp(
                sub.current_period_end, tz=timezone.utc
            ).isoformat(),
            cancel_at_period_end=sub.cancel_at_period_end,
            payment_method_last4=pm_last4,
            payment_method_brand=pm_brand,
            monthly_amount=round(amount, 2),
            currency=sub.currency or "usd",
        )

    except stripe.error.StripeError as exc:
        logger.error("Failed to fetch subscription: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve subscription details.",
        )


@router.get("/invoices", response_model=list[InvoiceItem])
async def list_invoices(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
) -> list[InvoiceItem]:
    """List the user's past invoices from Stripe."""
    if not current_user.stripe_account_id:
        return []

    try:
        invoices = stripe.Invoice.list(
            customer=current_user.stripe_account_id,
            limit=min(limit, 100),
        )

        items: list[InvoiceItem] = []
        for inv in invoices.auto_paging_iter():
            items.append(
                InvoiceItem(
                    id=inv.id,
                    date=datetime.fromtimestamp(
                        inv.created, tz=timezone.utc
                    ).isoformat(),
                    amount=(inv.amount_paid or 0) / 100,
                    currency=inv.currency or "usd",
                    status=inv.status or "unknown",
                    pdf_url=inv.invoice_pdf,
                    hosted_url=inv.hosted_invoice_url,
                )
            )
            if len(items) >= limit:
                break

        return items

    except stripe.error.StripeError as exc:
        logger.error("Failed to list invoices: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to retrieve invoices.",
        )


@router.post("/cancel", response_model=CancelResponse)
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CancelResponse:
    """Cancel the user's subscription at the end of the current billing period."""
    if not current_user.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active subscription to cancel.",
        )

    try:
        sub = await _get_active_subscription(current_user.stripe_account_id)
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No active subscription found.",
            )

        updated_sub = stripe.Subscription.modify(
            sub.id,
            cancel_at_period_end=True,
        )

        period_end = datetime.fromtimestamp(
            updated_sub.current_period_end, tz=timezone.utc
        ).isoformat()

        logger.info(
            "Subscription %s set to cancel at period end for user %s",
            sub.id,
            current_user.id,
        )

        return CancelResponse(
            status=updated_sub.status,
            cancel_at_period_end=True,
            current_period_end=period_end,
            message=f"Your subscription will remain active until {period_end}.",
        )

    except stripe.error.StripeError as exc:
        logger.error("Subscription cancellation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to cancel subscription. Please try again.",
        )


@router.post("/reactivate", response_model=ReactivateResponse)
async def reactivate_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ReactivateResponse:
    """Reactivate a cancelled subscription (before the period ends)."""
    if not current_user.stripe_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No billing account found.",
        )

    try:
        sub = await _get_active_subscription(current_user.stripe_account_id)
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No subscription found to reactivate.",
            )

        if not sub.cancel_at_period_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Subscription is not scheduled for cancellation.",
            )

        updated_sub = stripe.Subscription.modify(
            sub.id,
            cancel_at_period_end=False,
        )

        tier = updated_sub.metadata.get("tier", current_user.plan_tier.value)

        logger.info("Subscription %s reactivated for user %s", sub.id, current_user.id)

        return ReactivateResponse(
            status=updated_sub.status,
            tier=tier,
            message="Your subscription has been reactivated.",
        )

    except stripe.error.StripeError as exc:
        logger.error("Subscription reactivation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reactivate subscription. Please try again.",
        )
