"""API key management endpoints for Pro+ programmatic access."""

import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.api_key import APIKey
from app.models.user import PlanTier, User

router = APIRouter(prefix="/api-keys", tags=["api-keys"])

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

KEY_PREFIX = "rdai_live_"
KEY_RANDOM_LENGTH = 32  # chars of randomness after the prefix
MAX_KEYS_PER_USER = 10


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _generate_api_key() -> str:
    """Generate a new API key: rdai_live_<32 hex chars>."""
    random_part = secrets.token_hex(KEY_RANDOM_LENGTH // 2)  # 16 bytes -> 32 hex chars
    return f"{KEY_PREFIX}{random_part}"


def _hash_key(raw_key: str) -> str:
    """SHA-256 hash for storage."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class APIKeyCreate(BaseModel):
    name: str = Field("Default", max_length=255)
    rate_limit_per_hour: int = Field(100, ge=1, le=10000)
    expires_at: Optional[datetime] = None


class APIKeyCreated(BaseModel):
    """Returned only on creation — contains the unhashed key."""
    id: UUID
    name: str
    key: str  # full unhashed key — shown once
    key_prefix: str
    last_four: str
    rate_limit_per_hour: int
    expires_at: Optional[datetime] = None
    created_at: datetime


class APIKeyOut(BaseModel):
    """Masked representation for listing."""
    id: UUID
    name: str
    key_prefix: str
    last_four: str
    is_active: bool
    last_used_at: Optional[datetime] = None
    usage_count: int
    rate_limit_per_hour: int
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyUsage(BaseModel):
    id: UUID
    name: str
    usage_count: int
    last_used_at: Optional[datetime] = None
    rate_limit_per_hour: int
    requests_remaining_this_hour: int


# ---------------------------------------------------------------------------
# Dependency: require Pro+ tier
# ---------------------------------------------------------------------------

async def require_pro_tier(
    current_user: User = Depends(get_current_user),
) -> User:
    """Only Pro tier users can manage API keys."""
    if current_user.plan_tier == PlanTier.STARTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key access requires a Pro subscription or higher",
        )
    return current_user


# ---------------------------------------------------------------------------
# POST /api-keys — create a new key
# ---------------------------------------------------------------------------

@router.post("", response_model=APIKeyCreated, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pro_tier),
) -> APIKeyCreated:
    """Generate a new API key.  The raw key is returned once and never stored."""
    # Enforce per-user limit
    existing_count = (
        await db.execute(
            select(func.count(APIKey.id)).where(
                APIKey.user_id == current_user.id,
                APIKey.is_active.is_(True),
            )
        )
    ).scalar() or 0

    if existing_count >= MAX_KEYS_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Maximum of {MAX_KEYS_PER_USER} active API keys allowed",
        )

    raw_key = _generate_api_key()
    key_hash = _hash_key(raw_key)

    api_key = APIKey(
        user_id=current_user.id,
        name=payload.name,
        key_hash=key_hash,
        key_prefix=raw_key[:12],
        last_four=raw_key[-4:],
        rate_limit_per_hour=payload.rate_limit_per_hour,
        expires_at=payload.expires_at,
    )
    db.add(api_key)
    await db.flush()
    await db.refresh(api_key)

    return APIKeyCreated(
        id=api_key.id,
        name=api_key.name,
        key=raw_key,
        key_prefix=api_key.key_prefix,
        last_four=api_key.last_four,
        rate_limit_per_hour=api_key.rate_limit_per_hour,
        expires_at=api_key.expires_at,
        created_at=api_key.created_at,
    )


# ---------------------------------------------------------------------------
# GET /api-keys — list keys (masked)
# ---------------------------------------------------------------------------

@router.get("", response_model=list[APIKeyOut])
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pro_tier),
) -> list[APIKeyOut]:
    """List all API keys for the current user (masked, last 4 chars visible)."""
    result = await db.execute(
        select(APIKey)
        .where(APIKey.user_id == current_user.id)
        .order_by(APIKey.created_at.desc())
    )
    keys = result.scalars().all()
    return [APIKeyOut.model_validate(k) for k in keys]


# ---------------------------------------------------------------------------
# DELETE /api-keys/{id} — revoke a key
# ---------------------------------------------------------------------------

@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pro_tier),
) -> None:
    """Revoke (soft-delete) an API key."""
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")

    api_key.is_active = False
    await db.flush()


# ---------------------------------------------------------------------------
# GET /api-keys/{id}/usage — usage stats
# ---------------------------------------------------------------------------

@router.get("/{key_id}/usage", response_model=APIKeyUsage)
async def get_api_key_usage(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_pro_tier),
) -> APIKeyUsage:
    """Get usage statistics for a specific API key."""
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")

    # Calculate remaining requests this hour.
    # In production this would check a Redis counter; here we approximate
    # from the database usage_count and last_used_at.
    remaining = api_key.rate_limit_per_hour
    if api_key.last_used_at:
        one_hour_ago = datetime.now(timezone.utc) - __import__("datetime").timedelta(hours=1)
        if api_key.last_used_at >= one_hour_ago:
            # Rough estimate — real implementation uses a sliding window in Redis
            remaining = max(0, api_key.rate_limit_per_hour - min(api_key.usage_count, api_key.rate_limit_per_hour))

    return APIKeyUsage(
        id=api_key.id,
        name=api_key.name,
        usage_count=api_key.usage_count,
        last_used_at=api_key.last_used_at,
        rate_limit_per_hour=api_key.rate_limit_per_hour,
        requests_remaining_this_hour=remaining,
    )
