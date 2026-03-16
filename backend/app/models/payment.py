"""Payment ORM models.

Contains two models:
- ``Payment`` — tenant rent / fee payments against leases (original model).
- ``SubscriptionPayment`` — Stripe subscription payments for the SaaS billing.
"""

import enum
import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUID

if TYPE_CHECKING:
    from app.models.lease import Lease
    from app.models.tenant import Tenant
    from app.models.user import User


# ---------------------------------------------------------------------------
# Enums (tenant payments)
# ---------------------------------------------------------------------------


class PaymentType(str, enum.Enum):
    RENT = "rent"
    LATE_FEE = "late_fee"
    DEPOSIT = "deposit"
    OTHER = "other"


class PaymentMethod(str, enum.Enum):
    STRIPE = "stripe"
    ACH = "ach"
    ZELLE = "zelle"
    CASH = "cash"
    CHECK = "check"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


# ---------------------------------------------------------------------------
# Tenant Payment model (original, preserved)
# ---------------------------------------------------------------------------


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    lease_id: Mapped[uuid.UUID] = mapped_column(
        UUID(),
        ForeignKey("leases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    payment_type: Mapped[PaymentType] = mapped_column(
        Enum(PaymentType, name="payment_type"),
        default=PaymentType.RENT,
        nullable=False,
    )
    payment_method: Mapped[Optional[PaymentMethod]] = mapped_column(
        Enum(PaymentMethod, name="payment_method"),
        nullable=True,
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        default=PaymentStatus.PENDING,
        server_default="pending",
        nullable=False,
        index=True,
    )
    stripe_payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    paid_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    lease: Mapped["Lease"] = relationship("Lease", back_populates="payments")
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="payments")

    def __repr__(self) -> str:
        return f"<Payment {self.amount} {self.status.value}>"


# ---------------------------------------------------------------------------
# Subscription Payment enums
# ---------------------------------------------------------------------------


class SubscriptionPaymentStatus(str, enum.Enum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"


# ---------------------------------------------------------------------------
# Subscription Payment model (Stripe SaaS billing)
# ---------------------------------------------------------------------------


class SubscriptionPayment(TimestampMixin, Base):
    """Tracks Stripe subscription payments for RealDeal AI SaaS billing.

    Each row corresponds to a single invoice/charge from Stripe.
    """

    __tablename__ = "subscription_payments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    stripe_payment_intent_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
    )
    stripe_invoice_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    amount_cents: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(3),
        nullable=False,
        server_default="usd",
    )
    status: Mapped[SubscriptionPaymentStatus] = mapped_column(
        Enum(SubscriptionPaymentStatus, name="subscription_payment_status"),
        default=SubscriptionPaymentStatus.SUCCEEDED,
        nullable=False,
        index=True,
    )
    plan_tier: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    billing_period_start: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    billing_period_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("ix_sub_pay_user_id", "user_id"),
        Index("ix_sub_pay_stripe_pi", "stripe_payment_intent_id"),
    )

    @property
    def amount_dollars(self) -> float:
        return self.amount_cents / 100

    def __repr__(self) -> str:
        return (
            f"<SubscriptionPayment ${self.amount_cents / 100:.2f} "
            f"{self.status.value} user={self.user_id}>"
        )
