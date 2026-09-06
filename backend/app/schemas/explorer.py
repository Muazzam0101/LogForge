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


class EventSummaryItem(BaseModel):
    """Summary item for paginated list results in Logs Explorer."""
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
    sha256_hash: str
    created_at: datetime


class EventListResponse(BaseModel):
    """Paginated response envelope for /api/v1/logs."""
    model_config = ConfigDict(extra="ignore")

    total: int = Field(..., description="Total count of events matching filter query")
    limit: int = Field(..., description="Maximum records requested per page")
    offset: int = Field(..., description="Record offset position in result set")
    events: List[EventSummaryItem] = Field(default_factory=list, description="List of event summaries")
