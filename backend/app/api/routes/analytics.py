"""LogForge Dashboard Analytics API Endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ...core.logging import logger
from ...db.repositories.analytics_repository import AnalyticsRepository
from ...schemas.analytics import (
    AnalyticsDistributions,
    AnalyticsOverview,
    AnalyticsSummary,
    TrendPoint,
)
from ...schemas.response import ErrorResponse
from ..dependencies import get_database

router = APIRouter(prefix="/analytics", tags=["Dashboard Analytics & Telemetry"])


@router.get(
    "/overview",
    response_model=AnalyticsOverview,
    responses={
        status.HTTP_200_OK: {
            "model": AnalyticsOverview,
            "description": "Consolidated dashboard analytics including summary KPIs, categorical distributions, and trend data.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "Database unavailable.",
        },
    },
    summary="Get Complete Dashboard Analytics Overview",
    description=(
        "**Consolidated Operational Analytics:** Calculates total events, 24h metrics, format distributions, "
        "severity breakdown, action stats, top endpoints, and time series directly inside MySQL."
    ),
)
def get_analytics_overview(
    time_range: str = Query(default="24h", pattern="^(24h|7d|30d)$", description="Trend window (24h, 7d, 30d)"),
    db: Session = Depends(get_database),
) -> AnalyticsOverview:
    try:
        return AnalyticsRepository.get_overview(db, time_range=time_range)
    except SQLAlchemyError as exc:
        logger.error("Failed to compute analytics overview: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Unable to calculate operational analytics due to persistent storage unavailability.",
                },
            },
        )


@router.get(
    "/summary",
    response_model=AnalyticsSummary,
    responses={
        status.HTTP_200_OK: {"model": AnalyticsSummary, "description": "Top-level KPI summary."},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Database unavailable."},
    },
    summary="Get Dashboard KPI Summary",
)
def get_analytics_summary(db: Session = Depends(get_database)) -> AnalyticsSummary:
    try:
        return AnalyticsRepository.get_summary(db)
    except SQLAlchemyError as exc:
        logger.error("Failed to query analytics summary: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Unable to query dashboard summary from persistent storage.",
                },
            },
        )


@router.get(
    "/distributions",
    response_model=AnalyticsDistributions,
    responses={
        status.HTTP_200_OK: {"model": AnalyticsDistributions, "description": "Format, severity, and action distributions."},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Database unavailable."},
    },
    summary="Get Categorical Log Distributions",
)
def get_analytics_distributions(db: Session = Depends(get_database)) -> AnalyticsDistributions:
    try:
        summary = AnalyticsRepository.get_summary(db)
        return AnalyticsRepository.get_distributions(db, total_events=summary.total_events)
    except SQLAlchemyError as exc:
        logger.error("Failed to query analytics distributions: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Unable to compute distributions from persistent storage.",
                },
            },
        )


@router.get(
    "/trends",
    response_model=list[TrendPoint],
    responses={
        status.HTTP_200_OK: {"description": "Time series data points for event trends."},
        status.HTTP_503_SERVICE_UNAVAILABLE: {"model": ErrorResponse, "description": "Database unavailable."},
    },
    summary="Get Event Trends Time Series",
)
def get_analytics_trends(
    time_range: str = Query(default="24h", pattern="^(24h|7d|30d)$", description="Time range (24h, 7d, 30d)"),
    db: Session = Depends(get_database),
) -> list[TrendPoint]:
    try:
        return AnalyticsRepository.get_event_trends(db, time_range=time_range)
    except SQLAlchemyError as exc:
        logger.error("Failed to compute event trends: %s", exc.__class__.__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "Unable to query event trends from persistent storage.",
                },
            },
        )
