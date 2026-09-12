"""FastAPI routes for AI/ML Anomaly Detection."""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..dependencies import get_database
from ...db.repositories.anomaly_repository import AnomalyRepository
from ...ml.anomaly_model import model_instance
from ...ml.training import train_model_from_database
from ...schemas.anomaly import (
    AnomalyDetail,
    AnomalyListResponse,
    AnomalySummaryResponse,
    ModelStatusResponse,
    ModelTrainingRequest,
    ModelTrainingResponse,
)

logger = logging.getLogger("ulpf.api.ml")

router = APIRouter(prefix="/ml", tags=["AI/ML Anomaly Detection"])


@router.post(
    "/train",
    response_model=ModelTrainingResponse,
    status_code=status.HTTP_200_OK,
    summary="Train or retrain Isolation Forest model",
    description="Fits Isolation Forest on historical normalized log events stored in the database.",
)
def train_model(
    payload: Optional[ModelTrainingRequest] = None,
    db: Session = Depends(get_database),
) -> ModelTrainingResponse:
    contamination = payload.contamination if payload else 0.1
    max_samples = payload.max_samples if payload else 50000
    rescore = payload.rescore_existing if payload else True

    try:
        result = train_model_from_database(
            db=db,
            contamination=contamination,
            max_samples=max_samples,
            rescore_existing=rescore,
        )
        return ModelTrainingResponse(**result)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        logger.error("Failed to train model: %s", str(exc), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model training failed: {str(exc)}",
        )


@router.get(
    "/status",
    response_model=ModelStatusResponse,
    summary="Get ML model status and metadata",
)
def get_model_status() -> ModelStatusResponse:
    meta = model_instance.training_metadata or {}
    return ModelStatusResponse(
        is_trained=model_instance.is_trained,
        model_name=model_instance.model_name,
        model_version=model_instance.model_version,
        contamination=model_instance.contamination,
        samples_count=meta.get("samples_count") or meta.get("sample_count"),
        features_count=meta.get("features_count"),
        trained_at=meta.get("trained_at"),
    )


@router.get(
    "/anomalies",
    response_model=AnomalyListResponse,
    summary="Get paginated list of log anomalies",
)
def get_anomalies(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    classification: Optional[str] = Query(None, description="Filter by classification (Normal, Suspicious, Highly Anomalous)"),
    min_score: Optional[float] = Query(None, ge=0.0, le=1.0, description="Minimum anomaly score"),
    db: Session = Depends(get_database),
) -> AnomalyListResponse:
    repo = AnomalyRepository(db)
    items, total = repo.get_paginated_anomalies(
        page=page,
        page_size=page_size,
        classification=classification,
        min_score=min_score,
    )
    return AnomalyListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.get(
    "/anomalies/summary",
    response_model=AnomalySummaryResponse,
    summary="Get anomaly metrics summary for dashboard",
)
def get_anomaly_summary(db: Session = Depends(get_database)) -> AnomalySummaryResponse:
    repo = AnomalyRepository(db)
    return repo.get_summary()


@router.get(
    "/anomalies/{event_id}",
    response_model=AnomalyDetail,
    summary="Get anomaly details and explainability for a single event",
)
def get_anomaly_by_event_id(
    event_id: str,
    db: Session = Depends(get_database),
) -> AnomalyDetail:
    repo = AnomalyRepository(db)
    anomaly = repo.get_by_event_id(event_id)
    if not anomaly:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No anomaly scoring record found for event '{event_id}'",
        )
    return AnomalyDetail.model_validate(anomaly)
