"""Internal analytics tracking service.

Records user actions, computes engagement metrics, identifies popular
markets, and tracks conversion funnels.  All data lives in the
``analytics_events`` PostgreSQL table.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import case, cast, distinct, func, select, text, Integer, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analytics import AnalyticsEvent
from app.models.user import PlanTier, User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Known event names (constants to avoid typos)
# ---------------------------------------------------------------------------

EVENT_DEAL_VIEWED = "deal_viewed"
EVENT_DEAL_SAVED = "deal_saved"
EVENT_DEAL_COMPARED = "deal_compared"
EVENT_DEAL_EXPORTED = "deal_exported"
EVENT_ALERT_CREATED = "alert_created"
EVENT_SEARCH_PERFORMED = "search_performed"
EVENT_MARKET_VIEWED = "market_viewed"
EVENT_CONVERSION = "conversion"
EVENT_SIGNUP = "signup"
EVENT_LOGIN = "login"


class AnalyticsService:
    """Track user actions and compute engagement / conversion analytics."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Event tracking
    # ------------------------------------------------------------------

    async def track_event(
        self,
        user_id: UUID,
        event_name: str,
        properties: dict[str, Any] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AnalyticsEvent:
        """Record a single analytics event.

        Args:
            user_id: The authenticated user performing the action.
            event_name: One of the ``EVENT_*`` constants.
            properties: Arbitrary JSON payload with event-specific context.
            ip_address: Client IP (from request).
            user_agent: Client User-Agent header.

        Returns:
            The persisted ``AnalyticsEvent`` instance.
        """
        event = AnalyticsEvent(
            user_id=user_id,
            event_name=event_name,
            event_properties=properties or {},
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(event)
        await self.db.flush()

        logger.debug(
            "analytics_event user=%s event=%s props=%s",
            user_id,
            event_name,
            properties,
        )
        return event

    async def track_conversion(
        self,
        user_id: UUID,
        from_tier: str,
        to_tier: str,
        ip_address: str | None = None,
    ) -> AnalyticsEvent:
        """Track a subscription tier change (upgrade or downgrade).

        Stored as a ``conversion`` event with ``from_tier`` and ``to_tier``
        in the properties.
        """
        return await self.track_event(
            user_id=user_id,
            event_name=EVENT_CONVERSION,
            properties={
                "from_tier": from_tier,
                "to_tier": to_tier,
                "direction": "upgrade" if _tier_rank(to_tier) > _tier_rank(from_tier) else "downgrade",
            },
            ip_address=ip_address,
        )

    # ------------------------------------------------------------------
    # Engagement metrics
    # ------------------------------------------------------------------

    async def get_user_engagement(self, user_id: UUID) -> dict[str, Any]:
        """Return engagement metrics for a single user.

        Includes:
        - Total events (all time and last 30 days)
        - Event breakdown by name (last 30 days)
        - Days active in the last 30 days
        - First and last activity timestamps
        """
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)

        # Total events (all time)
        total_result = await self.db.execute(
            select(func.count(AnalyticsEvent.id)).where(
                AnalyticsEvent.user_id == user_id
            )
        )
        total_events = total_result.scalar_one()

        # Events in last 30 days, grouped by name
        recent_result = await self.db.execute(
            select(
                AnalyticsEvent.event_name,
                func.count(AnalyticsEvent.id).label("count"),
            )
            .where(
                AnalyticsEvent.user_id == user_id,
                AnalyticsEvent.created_at >= thirty_days_ago,
            )
            .group_by(AnalyticsEvent.event_name)
            .order_by(func.count(AnalyticsEvent.id).desc())
        )
        event_counts = {row.event_name: row.count for row in recent_result.all()}

        # Days active in last 30 days
        days_result = await self.db.execute(
            select(
                func.count(
                    distinct(func.date_trunc("day", AnalyticsEvent.created_at))
                )
            ).where(
                AnalyticsEvent.user_id == user_id,
                AnalyticsEvent.created_at >= thirty_days_ago,
            )
        )
        days_active = days_result.scalar_one()

        # First and last activity
        range_result = await self.db.execute(
            select(
                func.min(AnalyticsEvent.created_at),
                func.max(AnalyticsEvent.created_at),
            ).where(AnalyticsEvent.user_id == user_id)
        )
        first_activity, last_activity = range_result.one()

        # Recent events (last 30 days total)
        recent_total = sum(event_counts.values())

        return {
            "user_id": str(user_id),
            "total_events_all_time": total_events,
            "total_events_30d": recent_total,
            "days_active_30d": days_active,
            "events_by_type_30d": event_counts,
            "first_activity": first_activity.isoformat() if first_activity else None,
            "last_activity": last_activity.isoformat() if last_activity else None,
            "engagement_score": _compute_engagement_score(
                recent_total, days_active, event_counts
            ),
        }

    # ------------------------------------------------------------------
    # Popular markets
    # ------------------------------------------------------------------

    async def get_popular_markets(
        self, days: int = 30, limit: int = 20
    ) -> list[dict[str, Any]]:
        """Return the most searched and viewed markets.

        Aggregates ``market_viewed`` and ``search_performed`` events,
        extracting ``city``, ``state``, and ``zip_code`` from the event
        properties JSON.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        # Use a raw-ish approach for JSONB extraction
        result = await self.db.execute(
            select(
                AnalyticsEvent.event_properties["city"].astext.label("city"),
                AnalyticsEvent.event_properties["state"].astext.label("state"),
                func.count(AnalyticsEvent.id).label("event_count"),
                func.count(distinct(AnalyticsEvent.user_id)).label("unique_users"),
            )
            .where(
                AnalyticsEvent.event_name.in_(
                    [EVENT_MARKET_VIEWED, EVENT_SEARCH_PERFORMED]
                ),
                AnalyticsEvent.created_at >= cutoff,
                AnalyticsEvent.event_properties["city"].astext.isnot(None),
            )
            .group_by(
                AnalyticsEvent.event_properties["city"].astext,
                AnalyticsEvent.event_properties["state"].astext,
            )
            .order_by(func.count(AnalyticsEvent.id).desc())
            .limit(limit)
        )

        markets: list[dict[str, Any]] = []
        for row in result.all():
            markets.append(
                {
                    "city": row.city,
                    "state": row.state,
                    "event_count": row.event_count,
                    "unique_users": row.unique_users,
                }
            )
        return markets

    # ------------------------------------------------------------------
    # Conversion funnel
    # ------------------------------------------------------------------

    async def get_conversion_funnel(
        self, days: int = 90
    ) -> dict[str, Any]:
        """Compute the Free -> Pro -> Pro+ conversion funnel.

        Returns counts and rates for each tier transition.
        """
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        # Total users
        total_users_result = await self.db.execute(
            select(func.count(User.id)).where(User.is_active.is_(True))
        )
        total_users = total_users_result.scalar_one()

        # Users by tier
        tier_result = await self.db.execute(
            select(User.plan_tier, func.count(User.id))
            .where(User.is_active.is_(True))
            .group_by(User.plan_tier)
        )
        tier_counts = {row[0].value if hasattr(row[0], "value") else str(row[0]): row[1] for row in tier_result.all()}

        # Conversion events in period
        conv_result = await self.db.execute(
            select(
                AnalyticsEvent.event_properties["from_tier"].astext.label("from_tier"),
                AnalyticsEvent.event_properties["to_tier"].astext.label("to_tier"),
                func.count(AnalyticsEvent.id).label("count"),
            )
            .where(
                AnalyticsEvent.event_name == EVENT_CONVERSION,
                AnalyticsEvent.created_at >= cutoff,
            )
            .group_by(
                AnalyticsEvent.event_properties["from_tier"].astext,
                AnalyticsEvent.event_properties["to_tier"].astext,
            )
        )
        conversions: dict[str, int] = {}
        for row in conv_result.all():
            key = f"{row.from_tier}->{row.to_tier}"
            conversions[key] = row.count

        # Compute rates
        free_count = tier_counts.get("starter", 0) + tier_counts.get("free", 0)
        growth_count = tier_counts.get("growth", 0)
        pro_count = tier_counts.get("pro", 0)

        free_to_growth = conversions.get("starter->growth", 0) + conversions.get("free->growth", 0)
        growth_to_pro = conversions.get("growth->pro", 0)
        free_to_pro = conversions.get("starter->pro", 0) + conversions.get("free->pro", 0)

        return {
            "period_days": days,
            "total_users": total_users,
            "tier_distribution": tier_counts,
            "conversions": conversions,
            "rates": {
                "free_to_paid": (
                    round((free_to_growth + free_to_pro) / max(free_count, 1) * 100, 2)
                ),
                "growth_to_pro": (
                    round(growth_to_pro / max(growth_count, 1) * 100, 2)
                ),
                "overall_paid": (
                    round(
                        (growth_count + pro_count)
                        / max(total_users, 1)
                        * 100,
                        2,
                    )
                ),
            },
        }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _tier_rank(tier: str) -> int:
    """Return a numeric rank for tier ordering."""
    ranks = {
        "free": 0,
        "starter": 0,
        "growth": 1,
        "pro": 2,
        "enterprise": 3,
    }
    return ranks.get(tier.lower(), 0)


def _compute_engagement_score(
    total_events_30d: int,
    days_active_30d: int,
    event_counts: dict[str, int],
) -> int:
    """Compute a 0-100 engagement score based on recent activity.

    Weights:
    - Days active: up to 30 points
    - Total events: up to 30 points
    - Diversity of actions: up to 20 points
    - High-value actions (save, export, compare): up to 20 points
    """
    # Days active (max 30 days -> 30 points)
    days_score = min(30, days_active_30d)

    # Event volume (100+ events -> 30 points)
    volume_score = min(30, int(total_events_30d / 100 * 30))

    # Diversity (distinct event types, max 7 -> 20 points)
    diversity_score = min(20, len(event_counts) * 3)

    # High-value actions
    high_value = sum(
        event_counts.get(e, 0)
        for e in [EVENT_DEAL_SAVED, EVENT_DEAL_EXPORTED, EVENT_DEAL_COMPARED]
    )
    hv_score = min(20, high_value * 2)

    return min(100, days_score + volume_score + diversity_score + hv_score)
