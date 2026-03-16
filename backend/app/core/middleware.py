"""Production middleware stack: rate limiting, request logging, error handling, CORS.

Usage in main.py:
    from app.core.middleware import install_middleware
    install_middleware(app)
"""

from __future__ import annotations

import time
import traceback
import uuid
from typing import Any

import structlog
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

import redis.asyncio as aioredis

from app.core.config import settings

logger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Redis helper (shared by rate limiter and other middleware)
# ---------------------------------------------------------------------------

_redis_pool: aioredis.Redis | None = None


async def _get_redis() -> aioredis.Redis:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            max_connections=20,
        )
    return _redis_pool


# ---------------------------------------------------------------------------
# Tier-based rate limit definitions
# ---------------------------------------------------------------------------

# (requests_per_hour, deal_views_per_day)  -1 means unlimited
TIER_LIMITS: dict[str, tuple[int, int]] = {
    "starter": (50, 5),      # Free / Starter tier
    "free": (50, 5),
    "growth": (500, -1),     # Pro tier
    "pro": (500, -1),
    "pro_plus": (2000, -1),  # Pro+ tier
    "enterprise": (2000, -1),
}

# Paths that skip rate limiting entirely
RATE_LIMIT_SKIP_PATHS: set[str] = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
}

# Paths that count as "deal views"
DEAL_VIEW_PATH_PREFIXES: tuple[str, ...] = (
    "/api/v1/deals/",
    "/api/v1/properties/",
    "/api/v1/extension/analyze",
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter backed by Redis.

    Tracks per-user, per-endpoint request counts using sorted sets with
    timestamps as scores.  Returns HTTP 429 with ``Retry-After`` header
    when the user exceeds their tier's limit.
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path

        # Skip rate limiting for health/docs endpoints
        if path in RATE_LIMIT_SKIP_PATHS:
            return await call_next(request)

        # Extract user info from request state (set by auth middleware / dependency)
        user_id: str | None = getattr(request.state, "user_id", None)
        user_tier: str = getattr(request.state, "user_tier", "free")

        # For unauthenticated requests, rate limit by IP
        if not user_id:
            forwarded = request.headers.get("X-Forwarded-For")
            user_id = f"anon:{forwarded.split(',')[0].strip()}" if forwarded else f"anon:{request.client.host if request.client else 'unknown'}"
            user_tier = "free"

        hourly_limit, daily_deal_limit = TIER_LIMITS.get(
            user_tier, TIER_LIMITS["free"]
        )

        try:
            redis = await _get_redis()
            now = time.time()

            # --- Hourly request limit (sliding window) ---
            hourly_key = f"rl:hourly:{user_id}"
            pipe = redis.pipeline(transaction=True)
            window_start = now - 3600

            # Remove entries older than 1 hour
            pipe.zremrangebyscore(hourly_key, 0, window_start)
            # Count current entries
            pipe.zcard(hourly_key)
            # Add the current request
            pipe.zadd(hourly_key, {f"{now}:{uuid.uuid4().hex[:8]}": now})
            # Set expiry on the key so it cleans up
            pipe.expire(hourly_key, 3660)
            results = await pipe.execute()

            current_count: int = results[1]

            if current_count >= hourly_limit:
                # Calculate when the oldest entry will expire
                oldest = await redis.zrange(hourly_key, 0, 0, withscores=True)
                retry_after = int(3600 - (now - oldest[0][1])) + 1 if oldest else 60
                retry_after = max(1, retry_after)

                logger.warning(
                    "rate_limit_exceeded",
                    user_id=user_id,
                    tier=user_tier,
                    limit=hourly_limit,
                    count=current_count,
                    limit_type="hourly",
                )
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Rate limit exceeded. Please try again later.",
                        "limit": hourly_limit,
                        "window": "1h",
                        "retry_after_seconds": retry_after,
                    },
                    headers={"Retry-After": str(retry_after)},
                )

            # --- Daily deal-view limit (for free tier) ---
            is_deal_view = any(path.startswith(p) for p in DEAL_VIEW_PATH_PREFIXES)
            if is_deal_view and daily_deal_limit > 0:
                deal_key = f"rl:deals:{user_id}"
                deal_pipe = redis.pipeline(transaction=True)
                day_start = now - 86400

                deal_pipe.zremrangebyscore(deal_key, 0, day_start)
                deal_pipe.zcard(deal_key)
                deal_pipe.zadd(deal_key, {f"{now}:{uuid.uuid4().hex[:8]}": now})
                deal_pipe.expire(deal_key, 86460)
                deal_results = await deal_pipe.execute()

                deal_count: int = deal_results[1]

                if deal_count >= daily_deal_limit:
                    logger.warning(
                        "deal_view_limit_exceeded",
                        user_id=user_id,
                        tier=user_tier,
                        limit=daily_deal_limit,
                        count=deal_count,
                    )
                    return JSONResponse(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        content={
                            "detail": "Daily deal view limit reached. Upgrade your plan for unlimited access.",
                            "limit": daily_deal_limit,
                            "window": "24h",
                            "upgrade_url": "/pricing",
                        },
                        headers={"Retry-After": "3600"},
                    )

        except Exception as exc:
            # If Redis is down, fail open — let the request through
            logger.error("rate_limit_redis_error", error=str(exc))

        response = await call_next(request)

        # Add rate-limit headers to every response
        response.headers["X-RateLimit-Limit"] = str(hourly_limit)
        response.headers["X-RateLimit-Remaining"] = str(
            max(0, hourly_limit - current_count - 1)
        )
        response.headers["X-RateLimit-Reset"] = str(int(now + 3600))

        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log every HTTP request with structured JSON fields.

    Produces a single log line per request containing method, path, status
    code, duration in milliseconds, user ID, client IP, and a unique
    request ID for distributed tracing.  Sensitive headers are redacted.
    """

    REDACTED_HEADERS: frozenset[str] = frozenset({
        "authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "stripe-signature",
    })

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()

        # Bind request_id into structlog context for downstream loggers
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        # Store on request state for dependency injection consumers
        request.state.request_id = request_id

        # Extract client IP (respect reverse-proxy headers)
        forwarded = request.headers.get("X-Forwarded-For")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else "unknown")
        )

        # Try to extract user info early (populated by auth dependency)
        user_id: str | None = getattr(request.state, "user_id", None)

        try:
            response = await call_next(request)
        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.error(
                "request_error",
                method=request.method,
                path=request.url.path,
                status=500,
                duration_ms=duration_ms,
                user_id=user_id,
                ip=client_ip,
                error=str(exc),
            )
            raise

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Build safe headers dict
        {
            k: ("***REDACTED***" if k.lower() in self.REDACTED_HEADERS else v)
            for k, v in request.headers.items()
        }

        log_method = logger.info if response.status_code < 400 else logger.warning
        if response.status_code >= 500:
            log_method = logger.error

        log_method(
            "http_request",
            method=request.method,
            path=request.url.path,
            query=str(request.url.query) if request.url.query else None,
            status=response.status_code,
            duration_ms=duration_ms,
            user_id=user_id or getattr(request.state, "user_id", None),
            ip=client_ip,
            user_agent=request.headers.get("user-agent"),
            content_length=response.headers.get("content-length"),
        )

        # Propagate request ID in response for client-side tracing
        response.headers["X-Request-ID"] = request_id

        return response


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Catch-all for unhandled exceptions.

    - Logs full traceback via structlog.
    - Reports to Sentry in production (if configured).
    - Returns a sanitised JSON error to the client (hiding internals
      in production, showing details in development).
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            return await call_next(request)
        except Exception as exc:
            request_id = getattr(request.state, "request_id", "unknown")
            tb = traceback.format_exc()

            logger.error(
                "unhandled_exception",
                error=str(exc),
                error_type=type(exc).__name__,
                traceback=tb,
                path=request.url.path,
                method=request.method,
                request_id=request_id,
            )

            # Report to Sentry in production
            if settings.ENVIRONMENT == "production":
                try:
                    import sentry_sdk
                    sentry_sdk.capture_exception(exc)
                except ImportError:
                    pass

            # Build client-facing response
            if settings.ENVIRONMENT == "production":
                detail = "An internal error occurred. Please try again later."
                body: dict[str, Any] = {
                    "detail": detail,
                    "request_id": request_id,
                }
            else:
                body = {
                    "detail": str(exc),
                    "error_type": type(exc).__name__,
                    "traceback": tb.splitlines(),
                    "request_id": request_id,
                }

            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content=body,
            )


# ---------------------------------------------------------------------------
# Convenience installer
# ---------------------------------------------------------------------------


def install_middleware(app: FastAPI) -> None:
    """Register the full middleware stack on a FastAPI application.

    Order matters — the first middleware added is the outermost wrapper.
    We want:
        1. CORS (outermost, handles preflight)
        2. Error handling (catches everything below)
        3. Request logging (logs before/after the request)
        4. Rate limiting (innermost, runs closest to route handlers)
    """
    # 4 — Rate limiting (added first = innermost)
    app.add_middleware(RateLimitMiddleware)

    # 3 — Request logging
    app.add_middleware(RequestLoggingMiddleware)

    # 2 — Error handling
    app.add_middleware(ErrorHandlingMiddleware)

    # 1 — CORS (added last = outermost)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    )
