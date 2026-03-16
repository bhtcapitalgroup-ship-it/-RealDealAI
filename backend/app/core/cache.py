"""Redis caching layer with decorator support, TTL strategies, and orjson serialization.

Provides ``CacheService`` — a singleton-style helper for get/set/delete
operations — and a ``cached()`` decorator for transparent function-level
caching with configurable TTLs.
"""

from __future__ import annotations

import functools
import hashlib
import logging
from typing import Any, Awaitable, Callable, TypeVar

import orjson
import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

F = TypeVar("F", bound=Callable[..., Awaitable[Any]])

# ---------------------------------------------------------------------------
# TTL strategy constants (seconds)
# ---------------------------------------------------------------------------

TTL_PROPERTY_LIST = 300          # 5 minutes
TTL_PROPERTY_DETAIL = 900        # 15 minutes
TTL_MARKET_DATA = 3600           # 1 hour
TTL_HEATMAP = 1800               # 30 minutes
TTL_USER_SPECIFIC = 60           # 1 minute (short)
TTL_RENT_ESTIMATE = 7 * 86400   # 7 days
TTL_NEIGHBORHOOD = 30 * 86400   # 30 days
TTL_COMPS = 3 * 86400           # 3 days
TTL_VERDICT = 86400              # 1 day


class CacheService:
    """Async Redis cache with orjson serialization.

    Instantiate once and reuse throughout the application lifetime.
    All operations are fire-and-forget safe — Redis failures are logged
    but never bubble up to callers.
    """

    def __init__(self, redis_url: str | None = None) -> None:
        self._redis_url = redis_url or settings.REDIS_URL
        self._pool: aioredis.Redis | None = None

    async def _redis(self) -> aioredis.Redis:
        if self._pool is None:
            self._pool = aioredis.from_url(
                self._redis_url,
                decode_responses=False,   # orjson produces bytes
                max_connections=20,
            )
        return self._pool

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    async def get(self, key: str) -> Any | None:
        """Return the cached value for *key*, or ``None`` on miss / error."""
        try:
            r = await self._redis()
            raw: bytes | None = await r.get(key)
            if raw is not None:
                return orjson.loads(raw)
        except Exception as exc:
            logger.warning("cache GET failed for %s: %s", key, exc)
        return None

    async def set(
        self, key: str, value: Any, ttl_seconds: int = TTL_PROPERTY_LIST
    ) -> None:
        """Store *value* under *key* with the given TTL."""
        try:
            r = await self._redis()
            payload = orjson.dumps(value, option=orjson.OPT_NON_STR_KEYS)
            await r.set(key, payload, ex=ttl_seconds)
        except Exception as exc:
            logger.warning("cache SET failed for %s: %s", key, exc)

    async def delete(self, key: str) -> None:
        """Remove a single key from the cache."""
        try:
            r = await self._redis()
            await r.delete(key)
        except Exception as exc:
            logger.warning("cache DELETE failed for %s: %s", key, exc)

    async def invalidate_pattern(self, pattern: str) -> int:
        """Delete all keys matching a Redis glob *pattern*.

        Uses SCAN (non-blocking) rather than KEYS to avoid blocking the
        server on large datasets.

        Returns the number of keys deleted.
        """
        deleted = 0
        try:
            r = await self._redis()
            cursor: int = 0
            while True:
                cursor, keys = await r.scan(cursor=cursor, match=pattern, count=200)
                if keys:
                    await r.delete(*keys)
                    deleted += len(keys)
                if cursor == 0:
                    break
        except Exception as exc:
            logger.warning("cache INVALIDATE_PATTERN failed for %s: %s", pattern, exc)
        return deleted

    async def exists(self, key: str) -> bool:
        """Check whether *key* exists."""
        try:
            r = await self._redis()
            return bool(await r.exists(key))
        except Exception:
            return False

    async def ttl(self, key: str) -> int:
        """Return remaining TTL in seconds (``-2`` if key does not exist)."""
        try:
            r = await self._redis()
            return await r.ttl(key)
        except Exception:
            return -2

    async def close(self) -> None:
        """Shut down the underlying connection pool."""
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    # ------------------------------------------------------------------
    # Decorator
    # ------------------------------------------------------------------

    def cached(
        self,
        ttl_seconds: int = TTL_PROPERTY_LIST,
        prefix: str = "fn",
        key_builder: Callable[..., str] | None = None,
    ) -> Callable[[F], F]:
        """Decorator that caches the return value of an ``async`` function.

        Args:
            ttl_seconds: Time-to-live for the cached result.
            prefix: A string prefix for the cache key (helps with
                invalidation via patterns like ``fn:my_func:*``).
            key_builder: Optional callable that receives the same args/kwargs
                as the wrapped function and returns a cache key string.
                If ``None``, a deterministic key is generated from the
                function name and its arguments.

        Example::

            cache = CacheService()

            @cache.cached(ttl_seconds=TTL_MARKET_DATA, prefix="market")
            async def get_market_stats(zip_code: str) -> dict:
                ...
        """

        def decorator(fn: F) -> F:
            @functools.wraps(fn)
            async def wrapper(*args: Any, **kwargs: Any) -> Any:
                if key_builder is not None:
                    cache_key = key_builder(*args, **kwargs)
                else:
                    cache_key = _build_cache_key(prefix, fn.__qualname__, args, kwargs)

                # Try cache first
                cached_value = await self.get(cache_key)
                if cached_value is not None:
                    return cached_value

                # Compute
                result = await fn(*args, **kwargs)

                # Store (skip None results)
                if result is not None:
                    await self.set(cache_key, result, ttl_seconds)

                return result

            return wrapper  # type: ignore[return-value]

        return decorator


# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------

cache_service = CacheService()


# ---------------------------------------------------------------------------
# Key generation helpers
# ---------------------------------------------------------------------------


def _build_cache_key(
    prefix: str, func_name: str, args: tuple[Any, ...], kwargs: dict[str, Any]
) -> str:
    """Produce a deterministic cache key from function name + arguments.

    Argument values are hashed so the key length stays bounded.
    """
    raw_parts: list[str] = [prefix, func_name]

    # Positional args — skip ``self`` / ``cls`` (first arg if it is not
    # JSON-serializable).
    serializable_args: list[Any] = []
    for a in args:
        try:
            orjson.dumps(a, option=orjson.OPT_NON_STR_KEYS)
            serializable_args.append(a)
        except (TypeError, orjson.JSONEncodeError):
            serializable_args.append(str(a))

    if serializable_args:
        args_hash = hashlib.md5(
            orjson.dumps(serializable_args, option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SORT_KEYS)
        ).hexdigest()[:12]
        raw_parts.append(args_hash)

    if kwargs:
        sorted_kwargs: list[Any] = []
        for k in sorted(kwargs.keys()):
            v = kwargs[k]
            try:
                orjson.dumps(v, option=orjson.OPT_NON_STR_KEYS)
                sorted_kwargs.append((k, v))
            except (TypeError, orjson.JSONEncodeError):
                sorted_kwargs.append((k, str(v)))
        kwargs_hash = hashlib.md5(
            orjson.dumps(sorted_kwargs, option=orjson.OPT_NON_STR_KEYS | orjson.OPT_SORT_KEYS)
        ).hexdigest()[:12]
        raw_parts.append(kwargs_hash)

    return ":".join(raw_parts)
