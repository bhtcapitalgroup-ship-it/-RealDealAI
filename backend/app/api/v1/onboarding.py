"""User onboarding endpoints — preferences, recommendations, alert creation."""

from typing import Any, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.alert import Alert
from app.models.user import User
from app.models.user_preferences import ExperienceLevel, UserPreferences

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class PreferencesPayload(BaseModel):
    investment_types: Optional[List[str]] = Field(
        None, description='e.g. ["rental", "brrrr", "flip", "wholesale"]'
    )
    target_markets: Optional[List[dict[str, str]]] = Field(
        None, description='e.g. [{"city": "Austin", "state": "TX"}]'
    )
    budget_min: Optional[float] = Field(None, ge=0)
    budget_max: Optional[float] = Field(None, ge=0)
    min_cap_rate: Optional[float] = Field(None, ge=0, le=100)
    min_cash_flow: Optional[float] = Field(None)
    property_types: Optional[List[str]] = Field(
        None, description='e.g. ["single_family", "multi_family"]'
    )
    experience_level: Optional[str] = Field(
        None, description="beginner | intermediate | advanced"
    )
    onboarding_step: Optional[int] = Field(None, ge=0, le=6)


class PreferencesOut(BaseModel):
    id: UUID
    user_id: UUID
    investment_types: Optional[List[str]] = None
    target_markets: Optional[Any] = None
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    min_cap_rate: Optional[float] = None
    min_cash_flow: Optional[float] = None
    property_types: Optional[List[str]] = None
    experience_level: Optional[str] = None
    onboarding_completed: bool
    onboarding_step: int

    class Config:
        from_attributes = True


class RecommendedMarket(BaseModel):
    city: str
    state: str
    median_price: float
    median_rent: float
    cap_rate: float
    market_score: float
    reason: str


class OnboardingStatus(BaseModel):
    onboarding_completed: bool
    current_step: int
    total_steps: int
    steps_detail: dict[str, bool]


class AlertCreated(BaseModel):
    id: UUID
    name: str
    filters: dict[str, Any]


class AutoCreateAlertsResponse(BaseModel):
    alerts_created: int
    alerts: list[AlertCreated]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _get_or_create_preferences(
    user_id: UUID, db: AsyncSession
) -> UserPreferences:
    """Fetch or create the UserPreferences row for a user."""
    result = await db.execute(
        select(UserPreferences).where(UserPreferences.user_id == user_id)
    )
    prefs = result.scalar_one_or_none()
    if prefs is None:
        prefs = UserPreferences(user_id=user_id)
        db.add(prefs)
        await db.flush()
        await db.refresh(prefs)
    return prefs


# Market recommendation data (in production: from market_data + ML model)
_MARKET_DATA: list[dict[str, Any]] = [
    {
        "city": "Memphis",
        "state": "TN",
        "median_price": 185000,
        "median_rent": 1350,
        "cap_rate": 8.7,
        "market_score": 88,
        "reason": "High cash flow market with strong rent-to-price ratios",
    },
    {
        "city": "Indianapolis",
        "state": "IN",
        "median_price": 210000,
        "median_rent": 1500,
        "cap_rate": 8.1,
        "market_score": 86,
        "reason": "Affordable entry point with steady population growth",
    },
    {
        "city": "Cleveland",
        "state": "OH",
        "median_price": 145000,
        "median_rent": 1200,
        "cap_rate": 9.2,
        "market_score": 84,
        "reason": "Among the highest cap rates in the Midwest",
    },
    {
        "city": "Birmingham",
        "state": "AL",
        "median_price": 165000,
        "median_rent": 1250,
        "cap_rate": 8.5,
        "market_score": 82,
        "reason": "Strong rental demand with low vacancy rates",
    },
    {
        "city": "Kansas City",
        "state": "MO",
        "median_price": 225000,
        "median_rent": 1550,
        "cap_rate": 7.8,
        "market_score": 81,
        "reason": "Diversified economy with growing tech sector",
    },
    {
        "city": "Austin",
        "state": "TX",
        "median_price": 425000,
        "median_rent": 2100,
        "cap_rate": 5.2,
        "market_score": 79,
        "reason": "High appreciation potential with strong job growth",
    },
    {
        "city": "Jacksonville",
        "state": "FL",
        "median_price": 295000,
        "median_rent": 1750,
        "cap_rate": 6.8,
        "market_score": 80,
        "reason": "Population boom driving rental demand",
    },
    {
        "city": "St. Louis",
        "state": "MO",
        "median_price": 175000,
        "median_rent": 1300,
        "cap_rate": 8.3,
        "market_score": 78,
        "reason": "Extremely affordable with solid cash flow fundamentals",
    },
    {
        "city": "San Antonio",
        "state": "TX",
        "median_price": 275000,
        "median_rent": 1600,
        "cap_rate": 6.5,
        "market_score": 77,
        "reason": "Texas growth corridor with military base demand",
    },
    {
        "city": "Columbus",
        "state": "OH",
        "median_price": 250000,
        "median_rent": 1550,
        "cap_rate": 7.1,
        "market_score": 83,
        "reason": "University town with consistent rental demand",
    },
]


def _recommend_markets(prefs: UserPreferences) -> list[dict[str, Any]]:
    """Score and rank markets based on user preferences."""
    candidates = list(_MARKET_DATA)

    # Filter by budget if set
    if prefs.budget_max:
        candidates = [m for m in candidates if m["median_price"] <= float(prefs.budget_max)]
    if prefs.budget_min:
        candidates = [m for m in candidates if m["median_price"] >= float(prefs.budget_min)]

    # Filter by minimum cap rate
    if prefs.min_cap_rate:
        candidates = [m for m in candidates if m["cap_rate"] >= float(prefs.min_cap_rate)]

    # Sort by market_score descending
    candidates.sort(key=lambda m: m["market_score"], reverse=True)

    # If too few, fall back to full list sorted by score
    if len(candidates) < 3:
        candidates = sorted(_MARKET_DATA, key=lambda m: m["market_score"], reverse=True)

    return candidates[:5]


# ---------------------------------------------------------------------------
# POST /onboarding/preferences
# ---------------------------------------------------------------------------

@router.post("/preferences", response_model=PreferencesOut)
async def save_preferences(
    payload: PreferencesPayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PreferencesOut:
    """Save or update user investment preferences (called at each onboarding step)."""
    prefs = await _get_or_create_preferences(current_user.id, db)

    if payload.investment_types is not None:
        prefs.investment_types = payload.investment_types
    if payload.target_markets is not None:
        prefs.target_markets = payload.target_markets
    if payload.budget_min is not None:
        prefs.budget_min = payload.budget_min
    if payload.budget_max is not None:
        prefs.budget_max = payload.budget_max
    if payload.min_cap_rate is not None:
        prefs.min_cap_rate = payload.min_cap_rate
    if payload.min_cash_flow is not None:
        prefs.min_cash_flow = payload.min_cash_flow
    if payload.property_types is not None:
        prefs.property_types = payload.property_types
    if payload.experience_level is not None:
        try:
            prefs.experience_level = ExperienceLevel(payload.experience_level)
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid experience level: {payload.experience_level}",
            )
    if payload.onboarding_step is not None:
        prefs.onboarding_step = payload.onboarding_step
        if payload.onboarding_step >= 6:
            prefs.onboarding_completed = True

    await db.flush()
    await db.refresh(prefs)
    return PreferencesOut.model_validate(prefs)


# ---------------------------------------------------------------------------
# GET /onboarding/recommended-markets
# ---------------------------------------------------------------------------

@router.get("/recommended-markets", response_model=list[RecommendedMarket])
async def get_recommended_markets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RecommendedMarket]:
    """Return top 5 recommended markets based on user preferences."""
    prefs = await _get_or_create_preferences(current_user.id, db)
    markets = _recommend_markets(prefs)
    return [RecommendedMarket(**m) for m in markets]


# ---------------------------------------------------------------------------
# POST /onboarding/create-alerts
# ---------------------------------------------------------------------------

@router.post("/create-alerts", response_model=AutoCreateAlertsResponse)
async def auto_create_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AutoCreateAlertsResponse:
    """Auto-create deal alerts based on saved preferences."""
    prefs = await _get_or_create_preferences(current_user.id, db)

    created_alerts: list[AlertCreated] = []
    target_markets = prefs.target_markets or []

    # Build base criteria from preferences
    base_criteria: dict[str, Any] = {}
    if prefs.property_types:
        base_criteria["property_types"] = prefs.property_types
    if prefs.budget_min:
        base_criteria["min_price"] = float(prefs.budget_min)
    if prefs.budget_max:
        base_criteria["max_price"] = float(prefs.budget_max)
    if prefs.min_cap_rate:
        base_criteria["min_cap_rate"] = float(prefs.min_cap_rate)
    if prefs.min_cash_flow:
        base_criteria["min_cash_flow"] = float(prefs.min_cash_flow)

    if isinstance(target_markets, list) and len(target_markets) > 0:
        # Create one alert per target market
        for market in target_markets[:5]:  # cap at 5 auto-alerts
            city = market.get("city", "Unknown") if isinstance(market, dict) else str(market)
            state = market.get("state", "") if isinstance(market, dict) else ""
            market_label = f"{city}, {state}" if state else city

            criteria = {**base_criteria}
            if city:
                criteria["cities"] = [city]
            if state:
                criteria["states"] = [state]

            alert = Alert(
                user_id=current_user.id,
                name=f"Deals in {market_label}",
                filters=criteria,
                is_active=True,
            )
            db.add(alert)
            await db.flush()
            await db.refresh(alert)

            created_alerts.append(
                AlertCreated(id=alert.id, name=alert.name, filters=alert.filters)
            )
    else:
        # No specific markets — create a single general alert
        alert = Alert(
            user_id=current_user.id,
            name="New Investment Deals",
            filters=base_criteria if base_criteria else {"min_investment_score": 75},
            is_active=True,
        )
        db.add(alert)
        await db.flush()
        await db.refresh(alert)
        created_alerts.append(
            AlertCreated(id=alert.id, name=alert.name, filters=alert.filters)
        )

    return AutoCreateAlertsResponse(
        alerts_created=len(created_alerts),
        alerts=created_alerts,
    )


# ---------------------------------------------------------------------------
# GET /onboarding/status
# ---------------------------------------------------------------------------

@router.get("/status", response_model=OnboardingStatus)
async def get_onboarding_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnboardingStatus:
    """Return onboarding completion status (steps completed)."""
    prefs = await _get_or_create_preferences(current_user.id, db)

    steps_detail = {
        "investment_types": bool(prefs.investment_types and len(prefs.investment_types) > 0),
        "target_markets": bool(prefs.target_markets and len(prefs.target_markets) > 0),
        "budget": prefs.budget_min is not None or prefs.budget_max is not None,
        "criteria": prefs.min_cap_rate is not None or prefs.min_cash_flow is not None,
        "experience_level": prefs.experience_level is not None,
        "alerts_created": prefs.onboarding_completed,
    }

    return OnboardingStatus(
        onboarding_completed=prefs.onboarding_completed,
        current_step=prefs.onboarding_step,
        total_steps=6,
        steps_detail=steps_detail,
    )
