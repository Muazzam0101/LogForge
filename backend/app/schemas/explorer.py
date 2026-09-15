"""Pydantic schemas for LogForge Logs Explorer and Persistence APIs."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class EventDetailResponse(BaseModel):
    """Complete stored event representation for inspection and auditing."""
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: int
    event_id: str
    timestamp: Optional[datetime] = None
    detected_format: str
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    severity: Optional[str] = None
    raw_event: str
    normalized_event: Optional[Dict[str, Any]] = None
    additional_fields: Optional[Dict[str, Any]] = None
    sha256_hash: str
    created_at: datetime
    anomaly: Optional[Dict[str, Any]] = None


class EventSummaryItem(BaseModel):
    """Summary item for paginated list results in Logs Explorer."""
    model_config = ConfigDict(from_attributes=True, extra="ignore")

    id: Optional[int] = None
    event_id: str
    timestamp: Optional[datetime] = None
    detected_format: str
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    source_port: Optional[int] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    severity: Optional[str] = None
    raw_event: str = ""
    sha256_hash: str = ""
    created_at: Optional[datetime] = None


class EventListResponse(BaseModel):
    """Paginated response envelope for /api/v1/logs and /api/v1/search/events."""
    model_config = ConfigDict(extra="ignore")

    total: int = Field(..., description="Total count of events matching filter query")
    limit: int = Field(..., description="Maximum records requested per page")
    offset: int = Field(default=0, description="Record offset position in result set")
    page: Optional[int] = Field(default=1, description="1-indexed page number")
    events: List[EventSummaryItem] = Field(default_factory=list, description="List of event summaries")
    search_engine: Optional[str] = Field(default="mysql", description="Active search engine serving the query (opensearch | mysql_fallback)")
    search_after: Optional[str] = Field(default=None, description="Opaque cursor token for deep pagination via search_after")
