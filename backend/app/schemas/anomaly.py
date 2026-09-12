"""Pydantic Schemas for AI/ML Anomaly Detection."""
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AnomalyDetail(BaseModel):
    """Detailed anomaly scoring record for a specific event."""
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    anomaly_score: float = Field(..., ge=0.0, le=1.0)
    classification: str
    explanation: str
    model_name: str
    model_version: str
    features_snapshot: Optional[Dict[str, Any]] = None
    created_at: datetime


class AnomalyListItem(BaseModel):
    """Anomaly list item with joined event contextual details."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_id: str
    anomaly_score: float
    classification: str
    explanation: str
    created_at: datetime
    source_ip: Optional[str] = None
    destination_ip: Optional[str] = None
    destination_port: Optional[int] = None
    protocol: Optional[str] = None
    action: Optional[str] = None
    severity: Optional[str] = None


class AnomalyListResponse(BaseModel):
    """Paginated list of detected anomalies."""
    total: int
    page: int
    page_size: int
    items: List[AnomalyListItem]


class AnomalousSource(BaseModel):
    """Top source IP associated with anomalous events."""
    source_ip: str
    count: int
    avg_score: float
    max_score: float


class AnomalySummaryResponse(BaseModel):
    """Summary statistics for anomaly dashboard widget."""
    total_scored_events: int
    normal_count: int
    suspicious_count: int
    highly_anomalous_count: int
    average_anomaly_score: float
    model_name: str
    model_version: str
    is_trained: bool
    last_trained_at: Optional[str] = None
    top_anomalous_sources: List[AnomalousSource] = []


class ModelTrainingRequest(BaseModel):
    """Parameters for on-demand model retraining."""
    contamination: Optional[float] = Field(0.1, ge=0.01, le=0.5)
    max_samples: Optional[int] = Field(50000, ge=5, le=200000)
    rescore_existing: Optional[bool] = True


class ModelTrainingResponse(BaseModel):
    """Outcome of model retraining."""
    status: str
    message: str
    model_name: str
    model_version: str
    events_trained: int
    anomalies_scored: int
    contamination: float
    trained_at: str


class ModelStatusResponse(BaseModel):
    """Operational status of the Isolation Forest ML engine."""
    is_trained: bool
    model_name: str
    model_version: str
    contamination: float
    samples_count: Optional[int] = None
    features_count: Optional[int] = None
    trained_at: Optional[str] = None
