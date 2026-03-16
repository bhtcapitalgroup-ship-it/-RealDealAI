"""ScraperRun ORM model for tracking scraper execution history."""

import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin


class ScraperSource(str, enum.Enum):
    ZILLOW = "zillow"
    REDFIN = "redfin"
    REALTOR = "realtor"
    RENTOMETER = "rentometer"
    PUBLIC_RECORDS = "public_records"


class ScraperStatus(str, enum.Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ScraperTrigger(str, enum.Enum):
    SCHEDULE = "schedule"
    MANUAL = "manual"
    API = "api"


class ScraperRun(TimestampMixin, Base):
    """Tracks each execution of a property data scraper.

    Records timing, results (properties found/new/updated), errors, and
    what triggered the run for operational dashboards and debugging.
    """

    __tablename__ = "scraper_runs"

    source: Mapped[ScraperSource] = mapped_column(
        Enum(ScraperSource, name="scraper_source"),
        nullable=False,
        index=True,
    )
    status: Mapped[ScraperStatus] = mapped_column(
        Enum(ScraperStatus, name="scraper_status"),
        default=ScraperStatus.RUNNING,
        nullable=False,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    properties_found: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    properties_new: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    properties_updated: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    errors_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )
    error_log: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    target_market: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="City, State target for this scraper run",
    )
    triggered_by: Mapped[ScraperTrigger] = mapped_column(
        Enum(ScraperTrigger, name="scraper_trigger"),
        default=ScraperTrigger.SCHEDULE,
        nullable=False,
    )

    __table_args__ = (
        Index("ix_scraper_runs_source_started", "source", "started_at"),
        Index("ix_scraper_runs_status_started", "status", "started_at"),
    )

    def __repr__(self) -> str:
        return f"<ScraperRun {self.source.value} {self.status.value} started={self.started_at}>"
