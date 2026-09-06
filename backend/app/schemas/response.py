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
