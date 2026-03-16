"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine
from app.models.base import Base


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Import all models so they register with Base.metadata
    import app.models  # noqa: F401

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        import logging

        logging.getLogger(__name__).warning(
            "DB init failed (will retry on first request): %s", e
        )
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered property management platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include routers — catch import errors for optional modules
from app.api.v1.auth import router as auth_router
from app.api.v1.properties import router as properties_router
from app.api.v1.units import router as units_router
from app.api.v1.tenants import router as tenants_router
from app.api.v1.leases import router as leases_router
from app.api.v1.payments import router as payments_router
from app.api.v1.maintenance import router as maintenance_router
from app.api.v1.contractors import router as contractors_router
from app.api.v1.documents import router as documents_router
from app.api.v1.chat import router as chat_router
from app.api.v1.financials import router as financials_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.extension import router as extension_router

for r in [
    auth_router,
    properties_router,
    units_router,
    tenants_router,
    leases_router,
    payments_router,
    maintenance_router,
    contractors_router,
    documents_router,
    chat_router,
    financials_router,
    webhooks_router,
    extension_router,
]:
    app.include_router(r, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "version": settings.APP_VERSION}
