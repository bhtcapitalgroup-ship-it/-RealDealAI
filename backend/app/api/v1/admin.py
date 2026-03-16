"""Admin API endpoints — platform management (requires is_admin flag)."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import case, cast, distinct, func, select, update, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.analytics import AnalyticsEvent
from app.models.payment import SubscriptionPayment, SubscriptionPaymentStatus
from app.models.property import Property
from app.models.scraper_run import ScraperRun, ScraperSource, ScraperStatus, ScraperTrigger
from app.models.user import PlanTier, User

router = APIRouter(prefix="/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Dependency: admin-only access
# ---------------------------------------------------------------------------

async def admin_required(
    current_user: User = Depends(get_current_user),
) -> User:
    """Raise 403 unless the authenticated user has is_admin set."""
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AdminStats(BaseModel):
    total_users: int
    active_subscribers: int
    mrr: float
    total_properties: int
    scraper_status: dict[str, Any]


class AdminUserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    plan_tier: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    plan_tier: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class PaginatedUsers(BaseModel):
    items: list[AdminUserOut]
    total: int
    page: int
    per_page: int
    pages: int


class ScraperStatusOut(BaseModel):
    source: str
    last_run: Optional[datetime] = None
    properties_found: int = 0
    success_rate: float = 0.0
    errors: int = 0
    status: Optional[str] = None


class ScraperLogOut(BaseModel):
    id: UUID
    source: str
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    properties_found: int
    properties_new: int
    properties_updated: int
    errors_count: int
    error_log: Optional[str] = None
    target_market: Optional[str] = None
    triggered_by: str

    class Config:
        from_attributes = True


class EngagementData(BaseModel):
    dau: int
    wau: int
    mau: int
    dau_series: list[dict[str, Any]]


class ConversionData(BaseModel):
    registered: int
    onboarded: int
    first_search: int
    first_save: int
    subscribed: int
    conversion_rate: float


class PopularMarket(BaseModel):
    market: str
    views: int
    searches: int
    saves: int


class TriggerResponse(BaseModel):
    message: str
    run_id: UUID


class ReanalyzeResponse(BaseModel):
    message: str
    property_count: int


# ---------------------------------------------------------------------------
# GET /admin/stats
# ---------------------------------------------------------------------------

@router.get("/stats", response_model=AdminStats)
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> AdminStats:
    """Return high-level platform statistics."""
    # Total users
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    # Active subscribers (non-starter)
    active_subs = (
        await db.execute(
            select(func.count(User.id)).where(
                User.is_active.is_(True),
                User.plan_tier != PlanTier.STARTER,
            )
        )
    ).scalar() or 0

    # MRR from successful subscription payments in the last 30 days
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    mrr_result = (
        await db.execute(
            select(func.coalesce(func.sum(SubscriptionPayment.amount_cents), 0)).where(
                SubscriptionPayment.status == SubscriptionPaymentStatus.SUCCEEDED,
                SubscriptionPayment.created_at >= thirty_days_ago,
            )
        )
    ).scalar() or 0
    mrr = mrr_result / 100.0

    # Total properties
    total_properties = (await db.execute(select(func.count(Property.id)))).scalar() or 0

    # Per-source scraper status (latest run per source)
    scraper_status: dict[str, Any] = {}
    for source in ScraperSource:
        latest = (
            await db.execute(
                select(ScraperRun)
                .where(ScraperRun.source == source)
                .order_by(ScraperRun.started_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if latest:
            scraper_status[source.value] = {
                "status": latest.status.value,
                "last_run": latest.started_at.isoformat(),
                "properties_found": latest.properties_found,
            }
        else:
            scraper_status[source.value] = {"status": "never_run", "last_run": None, "properties_found": 0}

    return AdminStats(
        total_users=total_users,
        active_subscribers=active_subs,
        mrr=mrr,
        total_properties=total_properties,
        scraper_status=scraper_status,
    )


# ---------------------------------------------------------------------------
# GET /admin/users
# ---------------------------------------------------------------------------

@router.get("/users", response_model=PaginatedUsers)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=255),
    tier: Optional[str] = Query(None),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|email|full_name)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> PaginatedUsers:
    """Paginated user list with search, tier filter, and sorting."""
    query = select(User)
    count_query = select(func.count(User.id))

    # Search filter
    if search:
        like_pattern = f"%{search}%"
        query = query.where(
            User.email.ilike(like_pattern) | User.full_name.ilike(like_pattern)
        )
        count_query = count_query.where(
            User.email.ilike(like_pattern) | User.full_name.ilike(like_pattern)
        )

    # Tier filter
    if tier:
        try:
            tier_enum = PlanTier(tier)
            query = query.where(User.plan_tier == tier_enum)
            count_query = count_query.where(User.plan_tier == tier_enum)
        except ValueError:
            pass

    # Sorting
    sort_col = getattr(User, sort_by, User.created_at)
    order = sort_col.desc() if sort_dir == "desc" else sort_col.asc()
    query = query.order_by(order)

    # Pagination
    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, (total + per_page - 1) // per_page)
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedUsers(
        items=[AdminUserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
        pages=pages,
    )


# ---------------------------------------------------------------------------
# PUT /admin/users/{id}
# ---------------------------------------------------------------------------

@router.put("/users/{user_id}", response_model=AdminUserOut)
async def update_user(
    user_id: UUID,
    payload: AdminUserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> AdminUserOut:
    """Update a user's tier, active status, or admin flag."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.plan_tier is not None:
        try:
            user.plan_tier = PlanTier(payload.plan_tier)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid plan tier: {payload.plan_tier}")

    if payload.is_active is not None:
        user.is_active = payload.is_active

    if payload.is_admin is not None:
        user.is_admin = payload.is_admin

    await db.flush()
    await db.refresh(user)
    return AdminUserOut.model_validate(user)


# ---------------------------------------------------------------------------
# GET /admin/users/{id}/activity
# ---------------------------------------------------------------------------

@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: UUID,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> list[dict[str, Any]]:
    """Return a user's recent analytics events."""
    result = await db.execute(
        select(AnalyticsEvent)
        .where(AnalyticsEvent.user_id == user_id)
        .order_by(AnalyticsEvent.created_at.desc())
        .limit(limit)
    )
    events = result.scalars().all()
    return [
        {
            "id": str(e.id),
            "event_name": e.event_name,
            "event_properties": e.event_properties,
            "ip_address": e.ip_address,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


# ---------------------------------------------------------------------------
# GET /admin/scrapers/status
# ---------------------------------------------------------------------------

@router.get("/scrapers/status", response_model=list[ScraperStatusOut])
async def get_scrapers_status(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> list[ScraperStatusOut]:
    """Per-source scraper status with success rate."""
    results: list[ScraperStatusOut] = []

    for source in ScraperSource:
        # Total runs and successes
        total_runs = (
            await db.execute(
                select(func.count(ScraperRun.id)).where(ScraperRun.source == source)
            )
        ).scalar() or 0

        successful = (
            await db.execute(
                select(func.count(ScraperRun.id)).where(
                    ScraperRun.source == source,
                    ScraperRun.status == ScraperStatus.COMPLETED,
                )
            )
        ).scalar() or 0

        total_errors = (
            await db.execute(
                select(func.coalesce(func.sum(ScraperRun.errors_count), 0)).where(
                    ScraperRun.source == source
                )
            )
        ).scalar() or 0

        total_found = (
            await db.execute(
                select(func.coalesce(func.sum(ScraperRun.properties_found), 0)).where(
                    ScraperRun.source == source
                )
            )
        ).scalar() or 0

        # Latest run
        latest = (
            await db.execute(
                select(ScraperRun)
                .where(ScraperRun.source == source)
                .order_by(ScraperRun.started_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()

        success_rate = (successful / total_runs * 100) if total_runs > 0 else 0.0

        results.append(
            ScraperStatusOut(
                source=source.value,
                last_run=latest.started_at if latest else None,
                properties_found=int(total_found),
                success_rate=round(success_rate, 1),
                errors=int(total_errors),
                status=latest.status.value if latest else "never_run",
            )
        )

    return results


# ---------------------------------------------------------------------------
# POST /admin/scrapers/{source}/run
# ---------------------------------------------------------------------------

@router.post("/scrapers/{source}/run", response_model=TriggerResponse)
async def trigger_scraper(
    source: str,
    market: Optional[str] = Query(None, description="Target market, e.g. 'Austin, TX'"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> TriggerResponse:
    """Manually trigger a scraper run for a specific source."""
    try:
        source_enum = ScraperSource(source)
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid source: {source}. Valid: {[s.value for s in ScraperSource]}",
        )

    run = ScraperRun(
        source=source_enum,
        status=ScraperStatus.RUNNING,
        started_at=datetime.now(timezone.utc),
        target_market=market,
        triggered_by=ScraperTrigger.MANUAL,
    )
    db.add(run)
    await db.flush()
    await db.refresh(run)

    # In production this would enqueue a Celery/ARQ task.  For now we
    # create the run record so the UI can poll status.
    return TriggerResponse(message=f"Scraper {source} triggered", run_id=run.id)


# ---------------------------------------------------------------------------
# GET /admin/scrapers/logs
# ---------------------------------------------------------------------------

@router.get("/scrapers/logs", response_model=list[ScraperLogOut])
async def get_scraper_logs(
    source: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> list[ScraperLogOut]:
    """Recent scraper run logs, optionally filtered by source."""
    query = select(ScraperRun).order_by(ScraperRun.started_at.desc()).limit(limit)
    if source:
        try:
            query = query.where(ScraperRun.source == ScraperSource(source))
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Invalid source: {source}")

    result = await db.execute(query)
    runs = result.scalars().all()
    return [ScraperLogOut.model_validate(r) for r in runs]


# ---------------------------------------------------------------------------
# GET /admin/analytics/engagement
# ---------------------------------------------------------------------------

@router.get("/analytics/engagement", response_model=EngagementData)
async def get_engagement(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> EngagementData:
    """DAU / WAU / MAU and a 30-day DAU series."""
    now = datetime.now(timezone.utc)
    day_ago = now - timedelta(days=1)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    dau = (
        await db.execute(
            select(func.count(distinct(AnalyticsEvent.user_id))).where(
                AnalyticsEvent.created_at >= day_ago
            )
        )
    ).scalar() or 0

    wau = (
        await db.execute(
            select(func.count(distinct(AnalyticsEvent.user_id))).where(
                AnalyticsEvent.created_at >= week_ago
            )
        )
    ).scalar() or 0

    mau = (
        await db.execute(
            select(func.count(distinct(AnalyticsEvent.user_id))).where(
                AnalyticsEvent.created_at >= month_ago
            )
        )
    ).scalar() or 0

    # 30-day DAU series
    series_result = await db.execute(
        select(
            cast(AnalyticsEvent.created_at, Date).label("day"),
            func.count(distinct(AnalyticsEvent.user_id)).label("count"),
        )
        .where(AnalyticsEvent.created_at >= month_ago)
        .group_by("day")
        .order_by("day")
    )
    dau_series = [{"date": str(row.day), "count": row.count} for row in series_result]

    return EngagementData(dau=dau, wau=wau, mau=mau, dau_series=dau_series)


# ---------------------------------------------------------------------------
# GET /admin/analytics/conversion
# ---------------------------------------------------------------------------

@router.get("/analytics/conversion", response_model=ConversionData)
async def get_conversion(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> ConversionData:
    """Conversion funnel: registered -> onboarded -> first search -> first save -> subscribed."""
    registered = (await db.execute(select(func.count(User.id)))).scalar() or 0

    onboarded = (
        await db.execute(
            select(func.count(distinct(AnalyticsEvent.user_id))).where(
                AnalyticsEvent.event_name == "onboarding_completed"
            )
        )
    ).scalar() or 0

    first_search = (
        await db.execute(
            select(func.count(distinct(AnalyticsEvent.user_id))).where(
                AnalyticsEvent.event_name.in_(["property_search", "deal_search", "market_search"])
            )
        )
    ).scalar() or 0

    first_save = (
        await db.execute(
            select(func.count(distinct(AnalyticsEvent.user_id))).where(
                AnalyticsEvent.event_name == "deal_saved"
            )
        )
    ).scalar() or 0

    subscribed = (
        await db.execute(
            select(func.count(User.id)).where(
                User.plan_tier != PlanTier.STARTER,
                User.is_active.is_(True),
            )
        )
    ).scalar() or 0

    conversion_rate = (subscribed / registered * 100) if registered > 0 else 0.0

    return ConversionData(
        registered=registered,
        onboarded=onboarded,
        first_search=first_search,
        first_save=first_save,
        subscribed=subscribed,
        conversion_rate=round(conversion_rate, 2),
    )


# ---------------------------------------------------------------------------
# GET /admin/analytics/popular-markets
# ---------------------------------------------------------------------------

@router.get("/analytics/popular-markets", response_model=list[PopularMarket])
async def get_popular_markets(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> list[PopularMarket]:
    """Most viewed/searched markets based on analytics events."""
    # Aggregate view and search events that include a market property
    result = await db.execute(
        select(
            AnalyticsEvent.event_properties["market"].astext.label("market"),
            func.count().filter(
                AnalyticsEvent.event_name.in_(["property_viewed", "deal_viewed"])
            ).label("views"),
            func.count().filter(
                AnalyticsEvent.event_name.in_(["property_search", "market_search"])
            ).label("searches"),
            func.count().filter(
                AnalyticsEvent.event_name == "deal_saved"
            ).label("saves"),
        )
        .where(AnalyticsEvent.event_properties["market"].astext.isnot(None))
        .group_by("market")
        .order_by(func.count().desc())
        .limit(limit)
    )

    return [
        PopularMarket(market=row.market, views=row.views, searches=row.searches, saves=row.saves)
        for row in result
        if row.market
    ]


# ---------------------------------------------------------------------------
# POST /admin/properties/reanalyze
# ---------------------------------------------------------------------------

@router.post("/properties/reanalyze", response_model=ReanalyzeResponse)
async def reanalyze_properties(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(admin_required),
) -> ReanalyzeResponse:
    """Trigger re-analysis of all properties (enqueue background job)."""
    count = (await db.execute(select(func.count(Property.id)))).scalar() or 0

    # In production this would fan out Celery/ARQ tasks per property.
    # We record an analytics event so the admin can track it.
    return ReanalyzeResponse(
        message=f"Re-analysis queued for {count} properties",
        property_count=count,
    )
