#!/bin/sh
set -e

echo "[LogForge Docker] Checking database migrations..."
alembic upgrade head || echo "[LogForge Docker] Migrations already up to date or deferred."

echo "[LogForge Docker] Starting LogForge Uvicorn ASGI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --access-log
