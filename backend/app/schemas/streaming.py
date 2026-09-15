"""Schemas for Distributed Kafka Streaming and Asynchronous Ingestion."""
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .ingestion import _validate_not_binary


class LogIngestRequest(BaseModel):
    """Payload for asynchronously ingesting a single raw log event into Kafka."""
    model_config = ConfigDict(extra="forbid")

    raw_log: str = Field(
        ...,
        min_length=1,
        max_length=1_048_576,  # 1MB limit
        description="Raw security/system log line as received from sensor or agent",
        examples=['{"timestamp": "2026-09-15T12:00:00Z", "src_ip": "10.0.0.1", "action": "block"}'],
    )
    source_id: Optional[str] = Field(
        default=None,
        max_length=128,
        description="Unique identifier for the sending host, sensor, or agent (used as Kafka routing key)",
    )
    source_hint: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional parser hint (e.g., 'cisco_asa', 'palo_alto', 'snort')",
    )

    @field_validator("raw_log")
    @classmethod
    def validate_raw_log(cls, v: str) -> str:
        return _validate_not_binary(v)


class LogIngestResponse(BaseModel):
    """Immediate acknowledgement response (HTTP 202 Accepted) for async log ingestion."""
    status: str = Field(default="accepted", description="Status of ingestion ('accepted' or 'processed')")
    event_id: str = Field(..., description="Unique UUIDv4 tracking identifier for the log event")
    topic: Optional[str] = Field(default=None, description="Kafka topic where event was buffered")
    partition: Optional[int] = Field(default=None, description="Partition assigned (if available)")
    mode: str = Field(default="async_kafka", description="'async_kafka' or 'sync_fallback'")
    ingested_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BatchLogIngestItem(BaseModel):
    """Single item within a batch ingestion request."""
    raw_log: str = Field(..., min_length=1, max_length=1_048_576)
    source_id: Optional[str] = Field(default=None, max_length=128)
    source_hint: Optional[str] = Field(default=None, max_length=100)

    @field_validator("raw_log")
    @classmethod
    def validate_raw_log(cls, v: str) -> str:
        return _validate_not_binary(v)


class BatchLogIngestRequest(BaseModel):
    """Payload for bulk async log ingestion into Kafka."""
    model_config = ConfigDict(extra="forbid")

    logs: List[Union[str, BatchLogIngestItem]] = Field(
        ...,
        min_length=1,
        max_length=500,
        description="List of raw log strings or structured items to buffer into Kafka",
    )
    source_id: Optional[str] = Field(default=None, max_length=128)
    source_hint: Optional[str] = Field(default=None, max_length=100)


class BatchLogIngestResponse(BaseModel):
    """Response returned for bulk async log ingestion."""
    status: str = Field(default="accepted")
    total_received: int
    total_accepted: int
    total_failed: int
    mode: str = Field(default="async_kafka")
    event_ids: List[str] = Field(default_factory=list)
    errors: List[Dict[str, Any]] = Field(default_factory=list)


class StreamingTopicInfo(BaseModel):
    """Information regarding a provisioned Kafka topic."""
    name: str
    partitions: int
    status: str


class StreamingHealthResponse(BaseModel):
    """Real-time diagnostic health check for Apache Kafka streaming cluster."""
    status: str = Field(description="CONNECTED, DISCONNECTED, DISABLED, or UNAVAILABLE")
    enabled: bool
    bootstrap_servers: str
    cluster_id: Optional[str] = None
    brokers_count: int = 0
    topics: List[StreamingTopicInfo] = Field(default_factory=list)
    consumer_group: str
    message: str
