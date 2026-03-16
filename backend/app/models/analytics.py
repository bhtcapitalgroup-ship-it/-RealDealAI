"""Analytics event ORM model for tracking user actions and engagement."""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, func, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUID


class AnalyticsEvent(TimestampMixin, Base):
    """Stores individual analytics events for user behaviour tracking.

    Each row represents a single tracked action (deal viewed, search
    performed, etc.) with arbitrary JSON properties for the event context.
    """

    __tablename__ = "analytics_events"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    event_properties: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        server_default="{}",
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45),  # supports IPv6
        nullable=True,
    )
    user_agent: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    __table_args__ = (
        # Composite index for efficient queries on user + event + time
        Index(
            "ix_analytics_user_event_created",
            "user_id",
            "event_name",
            "created_at",
        ),
        # Index for time-range scans across all users
        Index(
            "ix_analytics_event_created",
            "event_name",
            "created_at",
        ),
    )

    def __repr__(self) -> str:
        return f"<AnalyticsEvent {self.event_name} user={self.user_id}>"
