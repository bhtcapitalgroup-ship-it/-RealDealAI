"""WebSocket endpoints for real-time deal alerts and analysis progress.

WS /ws/alerts  — Push new-deal notifications matching the user's saved alerts.
WS /ws/analysis — Stream incremental progress during property analysis.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from typing import Any
from uuid import UUID

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_factory
from app.models.alert import Alert
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websocket"])

# ---------------------------------------------------------------------------
# Connection manager
# ---------------------------------------------------------------------------


class ConnectionManager:
    """Track active WebSocket connections grouped by user ID.

    Thread-safe for a single asyncio event loop (the FastAPI default).
    """

    def __init__(self) -> None:
        # user_id -> set of WebSocket connections
        self._connections: dict[str, set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections.setdefault(user_id, set()).add(websocket)
        logger.info("ws_connect user=%s total=%d", user_id, self.total_connections)

    async def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(user_id)
            if conns:
                conns.discard(websocket)
                if not conns:
                    del self._connections[user_id]
        logger.info("ws_disconnect user=%s total=%d", user_id, self.total_connections)

    async def send_to_user(self, user_id: str, message: dict[str, Any]) -> int:
        """Send a JSON message to all connections for a given user.

        Returns the number of connections that received the message.
        """
        sent = 0
        async with self._lock:
            conns = self._connections.get(user_id, set()).copy()

        stale: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json(message)
                sent += 1
            except Exception:
                stale.append(ws)

        # Clean up broken connections
        if stale:
            async with self._lock:
                user_conns = self._connections.get(user_id)
                if user_conns:
                    for ws in stale:
                        user_conns.discard(ws)
                    if not user_conns:
                        del self._connections[user_id]
        return sent

    async def broadcast(self, message: dict[str, Any]) -> int:
        """Send a message to every connected user."""
        sent = 0
        async with self._lock:
            all_users = list(self._connections.keys())
        for uid in all_users:
            sent += await self.send_to_user(uid, message)
        return sent

    @property
    def total_connections(self) -> int:
        return sum(len(v) for v in self._connections.values())

    @property
    def connected_users(self) -> list[str]:
        return list(self._connections.keys())


# Singleton instances
alert_manager = ConnectionManager()
analysis_manager = ConnectionManager()


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------


async def _authenticate_ws_token(token: str | None) -> User | None:
    """Validate a JWT token and return the User, or None."""
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None

    async with async_session_factory() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Redis Pub/Sub listener for deal alerts
# ---------------------------------------------------------------------------

# Channel name used by background workers to publish new deals
DEAL_ALERTS_CHANNEL = "realdeal:deal_alerts"


async def _subscribe_to_deal_alerts(
    user_id: str, websocket: WebSocket
) -> None:
    """Listen to Redis pub/sub and forward matching alerts to the WebSocket.

    This runs as a background task for the lifetime of the connection.
    Alert matching is done by comparing the published deal against the
    user's saved alert filters.
    """
    try:
        redis = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True, max_connections=5
        )
        pubsub = redis.pubsub()
        await pubsub.subscribe(DEAL_ALERTS_CHANNEL)

        # Load user's alert filters
        async with async_session_factory() as db:
            result = await db.execute(
                select(Alert).where(
                    Alert.user_id == user_id,
                    Alert.is_active.is_(True),
                )
            )
            alerts = result.scalars().all()
            alert_filters = [
                {"id": str(a.id), "name": a.name, "filters": a.filters}
                for a in alerts
            ]

        async for message in pubsub.listen():
            if message["type"] != "message":
                continue

            try:
                deal_data = json.loads(message["data"])
            except (json.JSONDecodeError, TypeError):
                continue

            # Check each alert's filters against the deal
            for alert_def in alert_filters:
                if _deal_matches_alert(deal_data, alert_def["filters"]):
                    await websocket.send_json(
                        {
                            "type": "new_deal",
                            "property": deal_data,
                            "matched_alert": {
                                "id": alert_def["id"],
                                "name": alert_def["name"],
                            },
                            "timestamp": time.time(),
                        }
                    )
                    break  # One notification per deal per user

    except asyncio.CancelledError:
        pass
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("Deal alert subscriber error for user %s: %s", user_id, exc)
    finally:
        try:
            await pubsub.unsubscribe(DEAL_ALERTS_CHANNEL)
            await redis.close()
        except Exception:
            pass


def _deal_matches_alert(deal: dict[str, Any], filters: dict[str, Any]) -> bool:
    """Check whether a deal satisfies all of an alert's filter criteria.

    Supported filter keys:
        min_cap_rate, max_price, min_cash_flow, property_types (list),
        states (list), cities (list), min_score
    """
    if not filters:
        return True

    if "min_cap_rate" in filters:
        if (deal.get("cap_rate") or 0) < filters["min_cap_rate"]:
            return False

    if "max_price" in filters:
        if (deal.get("price") or float("inf")) > filters["max_price"]:
            return False

    if "min_cash_flow" in filters:
        if (deal.get("cash_flow") or 0) < filters["min_cash_flow"]:
            return False

    if "min_score" in filters:
        if (deal.get("investment_score") or 0) < filters["min_score"]:
            return False

    if "property_types" in filters and filters["property_types"]:
        if deal.get("property_type", "").lower() not in [
            pt.lower() for pt in filters["property_types"]
        ]:
            return False

    if "states" in filters and filters["states"]:
        if deal.get("state", "").upper() not in [
            s.upper() for s in filters["states"]
        ]:
            return False

    if "cities" in filters and filters["cities"]:
        if deal.get("city", "").lower() not in [
            c.lower() for c in filters["cities"]
        ]:
            return False

    return True


# ---------------------------------------------------------------------------
# WS /ws/alerts
# ---------------------------------------------------------------------------


@router.websocket("/ws/alerts")
async def ws_alerts(
    websocket: WebSocket,
    token: str | None = Query(None),
) -> None:
    """Real-time deal alerts matching the user's saved criteria.

    Connect with a JWT token as a query parameter:
        ws://host/ws/alerts?token=<jwt>

    Sends JSON messages of the form:
        {"type": "new_deal", "property": {...}, "matched_alert": {...}}
    """
    user = await _authenticate_ws_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = str(user.id)
    await alert_manager.connect(user_id, websocket)

    # Start the Redis subscriber in the background
    subscriber_task = asyncio.create_task(
        _subscribe_to_deal_alerts(user_id, websocket)
    )

    try:
        while True:
            # Handle incoming messages (ping/pong, or client commands)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json({"type": "ping", "ts": time.time()})
                except Exception:
                    break
                continue

            # Handle client pong or other messages
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            if msg_type == "pong":
                continue  # Client acknowledged our ping

            if msg_type == "refresh_alerts":
                # Client requests us to reload their alert filters
                # Cancel and restart the subscriber
                subscriber_task.cancel()
                try:
                    await subscriber_task
                except asyncio.CancelledError:
                    pass
                subscriber_task = asyncio.create_task(
                    _subscribe_to_deal_alerts(user_id, websocket)
                )
                await websocket.send_json({"type": "alerts_refreshed"})

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("ws_alerts error for user %s: %s", user_id, exc)
    finally:
        subscriber_task.cancel()
        try:
            await subscriber_task
        except asyncio.CancelledError:
            pass
        await alert_manager.disconnect(user_id, websocket)


# ---------------------------------------------------------------------------
# WS /ws/analysis
# ---------------------------------------------------------------------------

# Analysis step definitions
ANALYSIS_STEPS = [
    "fetching_data",
    "calculating_arv",
    "estimating_rent",
    "running_ai",
    "complete",
]


@router.websocket("/ws/analysis")
async def ws_analysis(
    websocket: WebSocket,
    token: str | None = Query(None),
) -> None:
    """Real-time progress updates during property analysis.

    Connect with a JWT token:
        ws://host/ws/analysis?token=<jwt>

    After connecting, send a message to start analysis:
        {"type": "start_analysis", "property_url": "https://..."}

    Receives incremental updates:
        {"type": "progress", "step": "fetching_data", "step_index": 0, "total_steps": 5, "data": null}
        {"type": "progress", "step": "calculating_arv", "step_index": 1, "total_steps": 5, "data": {"arv": 350000}}
        ...
        {"type": "progress", "step": "complete", "step_index": 4, "total_steps": 5, "data": {...full result...}}
    """
    user = await _authenticate_ws_token(token)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id = str(user.id)
    await analysis_manager.connect(user_id, websocket)

    try:
        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=60)
            except asyncio.TimeoutError:
                try:
                    await websocket.send_json({"type": "ping", "ts": time.time()})
                except Exception:
                    break
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json(
                    {"type": "error", "message": "Invalid JSON"}
                )
                continue

            msg_type = msg.get("type", "")

            if msg_type == "pong":
                continue

            if msg_type == "start_analysis":
                property_url = msg.get("property_url", "")
                property_id = msg.get("property_id", "")

                if not property_url and not property_id:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "Provide property_url or property_id",
                        }
                    )
                    continue

                # Run analysis in background, streaming progress via WS
                asyncio.create_task(
                    _run_analysis_with_progress(
                        user_id=user_id,
                        websocket=websocket,
                        property_url=property_url,
                        property_id=property_id,
                    )
                )

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.error("ws_analysis error for user %s: %s", user_id, exc)
    finally:
        await analysis_manager.disconnect(user_id, websocket)


async def _run_analysis_with_progress(
    user_id: str,
    websocket: WebSocket,
    property_url: str,
    property_id: str,
) -> None:
    """Execute property analysis steps and stream progress to the WebSocket.

    Each step publishes an incremental update.  If any step fails, an error
    message is sent and the process halts gracefully.
    """
    total_steps = len(ANALYSIS_STEPS)
    results: dict[str, Any] = {}

    async def _send_progress(
        step: str, step_index: int, data: Any = None, error: str | None = None
    ) -> None:
        try:
            await websocket.send_json(
                {
                    "type": "progress",
                    "step": step,
                    "step_index": step_index,
                    "total_steps": total_steps,
                    "data": data,
                    "error": error,
                    "timestamp": time.time(),
                }
            )
        except Exception:
            pass

    try:
        # Step 0 — Fetching data
        await _send_progress("fetching_data", 0)
        try:
            property_data = await _step_fetch_data(property_url, property_id)
            results["property"] = property_data
            await _send_progress("fetching_data", 0, data={"address": property_data.get("address", "")})
        except Exception as exc:
            await _send_progress("fetching_data", 0, error=str(exc))
            return

        # Step 1 — Calculating ARV
        await _send_progress("calculating_arv", 1)
        try:
            arv_data = await _step_calculate_arv(property_data)
            results["arv"] = arv_data
            await _send_progress("calculating_arv", 1, data=arv_data)
        except Exception as exc:
            await _send_progress("calculating_arv", 1, error=str(exc))
            return

        # Step 2 — Estimating rent
        await _send_progress("estimating_rent", 2)
        try:
            rent_data = await _step_estimate_rent(property_data)
            results["rent"] = rent_data
            await _send_progress("estimating_rent", 2, data=rent_data)
        except Exception as exc:
            await _send_progress("estimating_rent", 2, error=str(exc))
            return

        # Step 3 — Running AI analysis
        await _send_progress("running_ai", 3)
        try:
            ai_data = await _step_run_ai(property_data, arv_data, rent_data)
            results["ai_analysis"] = ai_data
            await _send_progress("running_ai", 3, data=ai_data)
        except Exception as exc:
            await _send_progress("running_ai", 3, error=str(exc))
            return

        # Step 4 — Complete
        await _send_progress("complete", 4, data=results)

    except Exception as exc:
        logger.error(
            "Analysis pipeline error for user %s: %s", user_id, exc, exc_info=True
        )
        await _send_progress("complete", total_steps - 1, error=f"Analysis failed: {exc}")


# ---------------------------------------------------------------------------
# Analysis step implementations
# ---------------------------------------------------------------------------


async def _step_fetch_data(property_url: str, property_id: str) -> dict[str, Any]:
    """Fetch property data from the scraping pipeline or database."""
    if property_id:
        async with async_session_factory() as db:
            from app.models.property import Property
            result = await db.execute(
                select(Property).where(Property.id == property_id)
            )
            prop = result.scalar_one_or_none()
            if prop:
                return {
                    "id": str(prop.id),
                    "address": f"{prop.address_line1}, {prop.city}, {prop.state} {prop.zip_code}",
                    "city": prop.city,
                    "state": prop.state,
                    "zip_code": prop.zip_code,
                    "property_type": prop.property_type.value if prop.property_type else "sfh",
                    "price": float(prop.purchase_price) if prop.purchase_price else None,
                }

    if property_url:
        # Delegate to the scraping service
        try:
            from app.tasks.scraping_tasks import scrape_property_sync
            data = scrape_property_sync(property_url)
            if data:
                return data
        except ImportError:
            pass

    return {
        "address": property_url or property_id,
        "source": "manual",
    }


async def _step_calculate_arv(property_data: dict[str, Any]) -> dict[str, Any]:
    """Calculate After Repair Value using comp data."""
    try:
        from app.services.rentcast import RentcastService

        svc = RentcastService()
        zip_code = property_data.get("zip_code", "")
        if zip_code:
            comps = await svc.get_comps(zip_code)
            if comps:
                values = [c.get("price", 0) for c in comps if c.get("price")]
                if values:
                    return {
                        "arv": round(sum(values) / len(values)),
                        "comp_count": len(values),
                        "low": min(values),
                        "high": max(values),
                    }
    except Exception as exc:
        logger.warning("ARV calculation fallback: %s", exc)

    price = property_data.get("price")
    estimated_arv = int(price * 1.2) if price else 0
    return {"arv": estimated_arv, "comp_count": 0, "method": "estimate"}


async def _step_estimate_rent(property_data: dict[str, Any]) -> dict[str, Any]:
    """Estimate rental income."""
    try:
        from app.services.rentcast import RentcastService

        svc = RentcastService()
        zip_code = property_data.get("zip_code", "")
        if zip_code:
            rent = await svc.get_rent_estimate(zip_code)
            if rent:
                return {
                    "monthly_rent": rent.get("rent", 0),
                    "rent_low": rent.get("rent_low", 0),
                    "rent_high": rent.get("rent_high", 0),
                }
    except Exception as exc:
        logger.warning("Rent estimation fallback: %s", exc)

    return {"monthly_rent": 0, "method": "unavailable"}


async def _step_run_ai(
    property_data: dict[str, Any],
    arv_data: dict[str, Any],
    rent_data: dict[str, Any],
) -> dict[str, Any]:
    """Run AI-powered deal analysis."""
    try:
        from app.ai.deal_analyzer import DealAnalyzer

        analyzer = DealAnalyzer()
        result = await analyzer.analyze(
            property_data=property_data,
            arv=arv_data.get("arv", 0),
            monthly_rent=rent_data.get("monthly_rent", 0),
        )
        return result
    except Exception as exc:
        logger.warning("AI analysis fallback: %s", exc)

    # Fallback: basic calculations
    price = property_data.get("price", 0) or 0
    arv = arv_data.get("arv", 0) or 0
    rent = rent_data.get("monthly_rent", 0) or 0
    annual_rent = rent * 12

    cap_rate = (annual_rent / price * 100) if price > 0 else 0
    roi = ((arv - price) / price * 100) if price > 0 else 0

    return {
        "investment_score": min(100, max(0, int(cap_rate * 10 + roi / 5))),
        "cap_rate": round(cap_rate, 2),
        "estimated_roi": round(roi, 2),
        "recommendation": "good" if cap_rate > 8 else "fair" if cap_rate > 5 else "poor",
        "method": "basic_calculation",
    }


# ---------------------------------------------------------------------------
# Utility: publish a deal alert from background workers
# ---------------------------------------------------------------------------


async def publish_deal_alert(deal_data: dict[str, Any]) -> None:
    """Publish a new deal to the Redis pub/sub channel.

    Call this from Celery tasks or any service that discovers a new deal
    matching potential alert criteria.
    """
    try:
        redis = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True, max_connections=5
        )
        await redis.publish(DEAL_ALERTS_CHANNEL, json.dumps(deal_data, default=str))
        await redis.close()
    except Exception as exc:
        logger.error("Failed to publish deal alert: %s", exc)
