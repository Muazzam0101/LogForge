"""System Health & Real-Time Performance Telemetry API Routes."""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.metrics import metrics_collector
from ...db.session import SessionLocal
from ...schemas.response import SystemPerformanceResponse
from ...search.client import search_client_manager
from ...streaming.admin import kafka_admin_service
from ..dependencies import get_database

router = APIRouter(prefix="/system", tags=["System Telemetry & Performance"])


@router.get(
    "/performance",
    response_model=SystemPerformanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Real-Time System Performance & Throughput Telemetry",
    description=(
        "Returns actual runtime performance measurements: events throughput (events/sec), "
        "processing latency percentiles (P50, P95, P99), ULPF stage execution breakdowns, "
        "real Kafka lag, database & search latency, and hardware resource utilization. "
        "Never returns synthetic or mock numbers."
    ),
)
def get_system_performance(db: Session = Depends(get_database)) -> SystemPerformanceResponse:
    # 1. Probe MySQL connection & measure roundtrip latency
    mysql_connected = True
    try:
        db.execute(text("SELECT 1")).scalar()
    except Exception:
        mysql_connected = False

    # 2. Probe OpenSearch status
    opensearch_connected = False
    if settings.OPENSEARCH_ENABLED:
        try:
            opensearch_connected = search_client_manager.is_available()
        except Exception:
            opensearch_connected = False

    # 3. Probe Kafka consumer lag
    kafka_lag = None
    if settings.KAFKA_ENABLED:
        try:
            kafka_lag = kafka_admin_service.get_consumer_lag()
        except Exception:
            kafka_lag = None

    # 4. Get snapshot from collector
    snapshot = metrics_collector.get_snapshot(
        kafka_lag=kafka_lag,
        mysql_connected=mysql_connected,
        opensearch_connected=opensearch_connected,
    )

    # 5. Attach subsystem status metadata
    snapshot["subsystems"] = {
        "mysql": {
            "status": "CONNECTED" if mysql_connected else "DISCONNECTED",
            "latency_ms": snapshot.get("mysql_latency_ms"),
        },
        "opensearch": {
            "status": "CONNECTED" if opensearch_connected else ("DISABLED" if not settings.OPENSEARCH_ENABLED else "DISCONNECTED"),
            "latency_ms": snapshot.get("opensearch_latency_ms"),
        },
        "kafka": {
            "status": "CONNECTED" if kafka_admin_service.is_available() else ("DISABLED" if not settings.KAFKA_ENABLED else "DISCONNECTED"),
            "lag": kafka_lag,
        },
    }

    return SystemPerformanceResponse(**snapshot)


@router.post(
    "/performance/reset",
    status_code=status.HTTP_200_OK,
    summary="Reset Performance Telemetry Counters",
    description="Resets all rolling latency windows and event counters for isolated benchmark runs.",
)
def reset_system_performance() -> Dict[str, str]:
    metrics_collector.reset()
    return {"status": "success", "message": "Performance telemetry counters reset successfully"}


@router.get(
    "/workers",
    status_code=status.HTTP_200_OK,
    summary="Active ULPF Worker Telemetry",
    description="Lists all actively reporting ULPF Kafka worker processes with heartbeat age and processed counts.",
)
def get_active_workers() -> Dict[str, Any]:
    return {
        "active_count": metrics_collector.get_active_worker_count(),
        "workers": metrics_collector.get_active_workers(),
    }
