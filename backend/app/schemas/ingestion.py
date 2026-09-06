from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class LogProcessRequest(BaseModel):
    """Payload for ingesting a single raw log event."""
    model_config = ConfigDict(extra="forbid")

    raw_log: str = Field(
        ...,
        min_length=1,
        max_length=1_048_576,  # 1 MB max size per log line
        description="Raw security/system log line as received from sensor/device",
        examples=['{"timestamp": "2026-09-06T10:00:00Z", "src_ip": "192.168.1.50", "dst_ip": "10.0.0.1", "action": "allow"}']
    )
    source_hint: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional hint for device/vendor origin (e.g. 'cisco_asa', 'palo_alto', 'snort')"
    )


class BatchLogProcessRequest(BaseModel):
    """Payload for ingesting a batch of raw log events."""
    model_config = ConfigDict(extra="forbid")

    raw_logs: List[str] = Field(
        ...,
        min_length=1,
        max_length=500,
        description="List of raw log lines to process in batch"
    )
    source_hint: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Optional common source hint for the entire batch"
    )
