from typing import Any, List, Optional
from pydantic import BaseModel, ConfigDict
from .event import ProcessingResult


class ErrorDetail(BaseModel):
    """Structured error payload for failed processing."""
    model_config = ConfigDict(extra="ignore")

    code: str
    message: str
    details: Optional[Any] = None


class ErrorResponse(BaseModel):
    """Standardized error response envelope."""
    model_config = ConfigDict(extra="ignore")

    status: str = "failed"
    error: ErrorDetail


class HealthResponse(BaseModel):
    """Health check response schema."""
    model_config = ConfigDict(extra="ignore")

    status: str
    service: str
    version: str
    registered_parsers: List[str]


class BatchProcessResponse(BaseModel):
    """Response envelope for batch log processing."""
    model_config = ConfigDict(extra="ignore")

    status: str
    total: int
    successful: int
    failed: int
    results: List[ProcessingResult]


class SystemPerformanceResponse(BaseModel):
    """Real runtime performance, throughput, latency, and resource metrics."""
    model_config = ConfigDict(extra="ignore")

    events_received: int
    events_processed: int
    events_failed: int
    events_routed_dlq: int = 0
    events_per_second: float
    avg_latency_ms: float
    p50_latency_ms: float
    p95_latency_ms: float
    p99_latency_ms: float
    min_latency_ms: float = 0.0
    max_latency_ms: float = 0.0
    kafka_lag: Optional[int] = None
    active_workers: int
    mysql_latency_ms: Optional[float] = None
    opensearch_latency_ms: Optional[float] = None
    cpu_percent: Optional[float] = None
    memory_percent: Optional[float] = None
    stage_timings_ms: Optional[dict[str, float]] = None
    subsystems: Optional[dict[str, Any]] = None
