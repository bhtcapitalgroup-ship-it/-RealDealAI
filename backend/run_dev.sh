#!/bin/bash
# RealDeal AI — Development server startup
# Runs with SQLite for local development (no Docker needed)

export DATABASE_URL="sqlite+aiosqlite:///./realdeal_dev.db"
export REDIS_URL="redis://localhost:6379/0"
export JWT_SECRET="dev-secret-change-in-production"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"
export DEBUG=true

echo "Starting RealDeal AI backend..."
echo "Database: SQLite (./realdeal_dev.db)"
echo "API docs: http://localhost:8000/docs"
echo ""

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
