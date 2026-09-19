from datetime import datetime, timezone
from typing import Any, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field


class EndpointEntity(BaseModel):
    """Network endpoint entity (source or destination)."""
    model_config = ConfigDict(extra="ignore")

    ip: Optional[str] = None
    port: Optional[int] = None
    mac: Optional[str] = None
    hostname: Optional[str] = None
    domain: Optional[str] = None
    user: Optional[str] = None
    bytes: Optional[int] = None
    packets: Optional[int] = None


class NetworkContext(BaseModel):
    """Network connection attributes."""
    model_config = ConfigDict(extra="ignore")

    protocol: Optional[str] = None
    transport: Optional[str] = None
    direction: Optional[str] = None
    session_id: Optional[str] = None


class DeviceContext(BaseModel):
    """Originating device or sensor context."""
    model_config = ConfigDict(extra="ignore")

    hostname: Optional[str] = None
    ip: Optional[str] = None
    vendor: Optional[str] = None
    product: Optional[str] = None
    version: Optional[str] = None


class UserContext(BaseModel):
    """Identity and user access context."""
    model_config = ConfigDict(extra="ignore")

    name: Optional[str] = None
    id: Optional[str] = None
    domain: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class ParserMetadata(BaseModel):
    """Parser execution telemetry."""
    model_config = ConfigDict(extra="ignore")

    parser_name: str
    format_detected: str
    parser_version: str = "1.0.0"
    parse_time_ms: Optional[float] = None


class NormalizedEvent(BaseModel):
    """Universal Event Schema (UES).
    
    Vendor-neutral, canonical representation of a cybersecurity event,
    designed according to NTRO ULPF guidelines. Extensible via additional_fields.
    """
    model_config = ConfigDict(extra="ignore")

    timestamp: Optional[datetime] = None
    event_type: Optional[str] = None
    event_category: Optional[str] = None
    action: Optional[str] = None  # Normalized action (allow, block, login, etc.)
    severity: Optional[str] = None  # critical, high, medium, low, informational
    severity_code: Optional[int] = None  # 0 to 10
    message: Optional[str] = None

    source: Optional[EndpointEntity] = None
    destination: Optional[EndpointEntity] = None
    network: Optional[NetworkContext] = None
    device: Optional[DeviceContext] = None
    user: Optional[UserContext] = None
    parser: Optional[ParserMetadata] = None

    # Extensible field preserving any unmapped vendor-specific attributes
    # Crucial for lossless standardization without data deletion.
    additional_fields: Dict[str, Any] = Field(default_factory=dict)


class ProcessingMetadata(BaseModel):
    """Telemetry and trace metadata for ULPF processing."""
    model_config = ConfigDict(extra="ignore")

    ingested_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processing_time_ms: float
    engine_version: str = "0.1.0"
    stage_timings_ms: Optional[Dict[str, float]] = None


class ProcessingResult(BaseModel):
    """Complete lossless outcome of processing a raw log through ULPF.
    
    Preserves exact original string, cryptographic digest, normalized schema,
    and processing telemetry.
    """
    model_config = ConfigDict(extra="ignore")

    status: str  # "success" | "failed"
    event_id: str
    format_detected: str
    normalized_event: Optional[NormalizedEvent] = None
    raw_event: str
    raw_event_hash: str
    processing_metadata: ProcessingMetadata
    error: Optional[Dict[str, Any]] = None
