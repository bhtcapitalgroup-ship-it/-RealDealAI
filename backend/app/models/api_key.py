"""API Key ORM model for external API access (Pro+ users)."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUID

if TYPE_CHECKING:
    from app.models.user import User


class APIKey(TimestampMixin, Base):
    """Stores hashed API keys for programmatic access.

    The raw key is returned exactly once on creation.  Only the SHA-256
    hash is persisted.  ``key_prefix`` (first 8 chars) and ``last_four``
    allow the user to identify keys without exposing the secret.
    """

    __tablename__ = "api_keys"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        default="Default",
    )
    key_hash: Mapped[str] = mapped_column(
        String(64),  # SHA-256 hex digest
        nullable=False,
        unique=True,
        index=True,
    )
    key_prefix: Mapped[str] = mapped_column(
        String(12),  # e.g. "rdai_liv"
        nullable=False,
    )
    last_four: Mapped[str] = mapped_column(
        String(4),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default="true",
        nullable=False,
    )
    last_used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    usage_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    rate_limit_per_hour: Mapped[int] = mapped_column(
        Integer,
        default=100,
        server_default="100",
        nullable=False,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])

    def __repr__(self) -> str:
        return f"<APIKey {self.key_prefix}...{self.last_four} user={self.user_id}>"
