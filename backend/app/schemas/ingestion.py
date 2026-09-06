from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _validate_not_binary(value: str) -> str:
    """Rejects binary signatures, null bytes, and non-log document streams."""
    if not isinstance(value, str):
        raise ValueError("Raw log payload must be a text string")

    stripped = value.strip()
    if not stripped:
        raise ValueError("Raw log payload cannot be empty or whitespace only")

    # Null byte check: plain-text logs never contain \x00
    if "\x00" in value:
        raise ValueError("Binary content detected: raw log contains null bytes (\\x00)")

    # PDF document stream signature
    if stripped.startswith("%PDF-"):
        raise ValueError("Unsupported format: PDF document streams cannot be processed as logs")

    # PNG image signature in string form
    if stripped.startswith("\x89PNG") or "PNG\r\n\x1a\n" in value[:30]:
        raise ValueError("Unsupported format: PNG image binary data cannot be processed as logs")

    return value


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

    @field_validator("raw_log")
    @classmethod
    def validate_raw_log(cls, v: str) -> str:
        return _validate_not_binary(v)


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

    @field_validator("raw_logs")
    @classmethod
    def validate_raw_logs(cls, v: List[str]) -> List[str]:
        for i, item in enumerate(v):
            try:
                _validate_not_binary(item)
            except ValueError as e:
                raise ValueError(f"Item #{i + 1} failed validation: {str(e)}")
        return v
