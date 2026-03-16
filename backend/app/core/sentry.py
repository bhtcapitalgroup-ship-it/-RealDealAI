"""Sentry integration for error tracking and performance monitoring.

Call ``init_sentry()`` once at application startup.  It reads configuration
from ``settings`` and is a no-op when ``SENTRY_DSN`` is empty or the
environment is ``development``.
"""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

# We read SENTRY_DSN from an env-var (not in Settings yet) so the module
# is self-contained and safe to import even when sentry-sdk is not installed.
SENTRY_DSN: str = getattr(settings, "SENTRY_DSN", "") or ""


def init_sentry() -> None:
    """Initialise Sentry SDK if a DSN is configured and we are not in dev mode."""
    if not SENTRY_DSN:
        logger.debug("Sentry DSN not set — skipping initialisation")
        return

    if settings.ENVIRONMENT == "development" and not settings.DEBUG:
        logger.debug("Sentry disabled in development (set DEBUG=true to force)")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.asyncio import AsyncioIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.httpx import HttpxIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
        from sentry_sdk.integrations.starlette import StarletteIntegration
    except ImportError:
        logger.warning("sentry-sdk is not installed — skipping Sentry init")
        return

    traces_sample_rate = _traces_sample_rate()

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        release=f"realdeal-ai@{settings.APP_VERSION}",
        traces_sample_rate=traces_sample_rate,
        profiles_sample_rate=traces_sample_rate,
        send_default_pii=False,
        # Integrations
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            StarletteIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
            AsyncioIntegration(),
            HttpxIntegration(),
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR,
            ),
        ],
        # Filter out expected/benign errors
        before_send=_before_send,
        # Custom traces sampler for fine-grained control
        traces_sampler=_traces_sampler,
    )

    logger.info(
        "Sentry initialised (env=%s, traces_sample_rate=%.2f)",
        settings.ENVIRONMENT,
        traces_sample_rate,
    )


# ---------------------------------------------------------------------------
# Hooks
# ---------------------------------------------------------------------------

# HTTP status codes that should NOT be reported to Sentry
_IGNORED_STATUS_CODES: frozenset[int] = frozenset({401, 403, 404, 405, 422, 429})


def _before_send(
    event: dict[str, Any], hint: dict[str, Any]
) -> dict[str, Any] | None:
    """Filter callback — return ``None`` to drop the event."""
    exc_info = hint.get("exc_info")
    if exc_info:
        exc_type, exc_value, _ = exc_info

        # Drop FastAPI / Starlette HTTP exceptions with expected codes
        from fastapi.exceptions import HTTPException as FastAPIHTTPException
        from starlette.exceptions import HTTPException as StarletteHTTPException

        if isinstance(exc_value, (FastAPIHTTPException, StarletteHTTPException)):
            if exc_value.status_code in _IGNORED_STATUS_CODES:
                return None

        # Drop connection-reset / client-disconnect noise
        if exc_type.__name__ in (
            "ConnectionResetError",
            "BrokenPipeError",
            "ClientDisconnect",
        ):
            return None

    return event


def _traces_sample_rate() -> float:
    """Choose a traces sample rate based on environment."""
    rates: dict[str, float] = {
        "production": 0.2,
        "staging": 0.5,
        "development": 1.0,
    }
    return rates.get(settings.ENVIRONMENT, 0.1)


def _traces_sampler(sampling_context: dict[str, Any]) -> float:
    """Per-transaction sampler for more granular control.

    Health-check and static-asset requests get a very low sample rate.
    Slow endpoints (scraping, AI) are sampled at a higher rate.
    """
    transaction_name: str = sampling_context.get("transaction_context", {}).get(
        "name", ""
    )

    if "/health" in transaction_name:
        return 0.0
    if "/docs" in transaction_name or "/openapi" in transaction_name:
        return 0.0
    if "/ws/" in transaction_name:
        return 0.05

    # Higher rate for expensive operations we want to profile
    if any(
        seg in transaction_name
        for seg in ("/analyze", "/scrape", "/ai/", "/market")
    ):
        return min(1.0, _traces_sample_rate() * 2)

    return _traces_sample_rate()


# ---------------------------------------------------------------------------
# Context helpers (call from middleware / dependencies)
# ---------------------------------------------------------------------------


def set_user_context(user_id: str, email: str | None = None, tier: str | None = None) -> None:
    """Attach authenticated user info to the current Sentry scope."""
    try:
        import sentry_sdk

        sentry_sdk.set_user(
            {
                "id": user_id,
                "email": email or "",
                "subscription": tier or "free",
            }
        )
    except ImportError:
        pass


def add_breadcrumb(
    category: str,
    message: str,
    level: str = "info",
    data: dict[str, Any] | None = None,
) -> None:
    """Add a custom breadcrumb to the current Sentry scope.

    Useful for tracking scraping steps, AI calls, etc. so that when an
    error occurs the preceding actions are visible in the Sentry UI.
    """
    try:
        import sentry_sdk

        sentry_sdk.add_breadcrumb(
            category=category,
            message=message,
            level=level,
            data=data or {},
        )
    except ImportError:
        pass
