"""Alert ORM model — user-defined investment deal alerts."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUID

if TYPE_CHECKING:
    from app.models.user import User


class Alert(TimestampMixin, Base):
    __tablename__ = "alerts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    filters: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        server_default="{}",
        comment=(
            "JSON filter object. Supported keys: min_cap_rate, max_price, "
            "min_cash_flow, property_types (list), states (list), cities (list), min_score"
        ),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False
    )
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="alerts")

    def __repr__(self) -> str:
        return f"<Alert {self.name} user={self.user_id}>"
