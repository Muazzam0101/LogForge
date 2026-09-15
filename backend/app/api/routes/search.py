"""OpenSearch Scalability & Distributed Query API Endpoints.

Provides high-speed log search, full-text exploration, deep pagination, cluster health checks,
and administrative reindexing from authoritative MySQL storage.
"""
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ...audit.service import audit_service
from ...core.logging import logger
from ...models.auth import UserModel
from ...schemas.explorer import EventListResponse
from ...schemas.response import ErrorResponse
from ...search.service import search_service
from ..dependencies import get_database, require_permission


router = APIRouter(prefix="/search", tags=["OpenSearch Scalability & Analytics"])


class OpenSearchHealthResponse(BaseModel):
    """OpenSearch cluster and index status schema."""
    status: str = Field(..., description="CONNECTED | DISCONNECTED | DISABLED | DEGRADED")
    enabled: bool = Field(..., description="Whether OpenSearch search layer is enabled in configuration")
    cluster_name: Optional[str] = Field(None, description="OpenSearch cluster identifier")
    cluster_status: Optional[str] = Field(None, description="green | yellow | red | unknown")
    index_name: Optional[str] = Field(None, description="Active underlying storage index")
    alias_name: Optional[str] = Field(None, description="Active query alias")
    index_exists: Optional[bool] = Field(None, description="Whether the event index exists")
    document_count: Optional[int] = Field(None, description="Total documents indexed")
    message: Optional[str] = Field(None, description="Informational or diagnostic message")


class ReindexRequest(BaseModel):
    """Administrative request body for reindexing from MySQL."""
    batch_size: Optional[int] = Field(500, ge=10, le=5000, description="Chunk size for bulk ingestion")


class ReindexResponse(BaseModel):
    """Reindex execution report."""
    status: str
    total_mysql_events: int = 0
    indexed_documents: int = 0
    failed_documents: int = 0
    duration_seconds: float = 0.0
    message: Optional[str] = None


@router.get(
    "/events",
    response_model=EventListResponse,
    responses={
        status.HTTP_200_OK: {
            "model": EventListResponse,
            "description": "Paginated events from OpenSearch or MySQL fallback.",
        },
        status.HTTP_500_INTERNAL_SERVER_ERROR: {
            "model": ErrorResponse,
            "description": "Unexpected search processing failure.",
        },
    },
    summary="Distributed Event Search & Exploration",
    description=(
        "**High-Performance Log Search:** Executes high-speed queries across OpenSearch with support for "
        "full-text matching, multi-criteria filtering, time ranges, and search_after deep pagination. "
        "Seamlessly and transparently falls back to MySQL persistence if OpenSearch is unavailable or disabled."
    ),
)
def search_events(
    engine: str = Query("mysql", description="Storage engine selector: 'mysql' (default) | 'opensearch' | 'auto'"),
    q: Optional[str] = Query(None, description="Free-text search across raw_event, message, and hostnames"),
    event_id: Optional[str] = Query(None, description="Exact UUIDv4 event identifier"),
    source_ip: Optional[str] = Query(None, description="Source IP address filter"),
    destination_ip: Optional[str] = Query(None, description="Destination IP address filter"),
    source_port: Optional[int] = Query(None, description="Source port number"),
    destination_port: Optional[int] = Query(None, description="Destination port number"),
    protocol: Optional[str] = Query(None, description="Transport/Network protocol (tcp, udp, icmp)"),
    action: Optional[str] = Query(None, description="Security enforcement action (allow, block, drop)"),
    severity: Optional[str] = Query(None, description="Normalized severity (critical, high, medium, low)"),
    event_type: Optional[str] = Query(None, description="Event classification type"),
    detected_format: Optional[str] = Query(None, description="Detected format (json, cef, syslog)"),
    start_time: Optional[datetime] = Query(None, alias="from", description="Lower time boundary"),
    end_time: Optional[datetime] = Query(None, alias="to", description="Upper time boundary"),
    limit: int = Query(50, ge=1, le=500, description="Page size limit"),
    offset: int = Query(0, ge=0, description="Offset position for shallow pagination"),
    search_after: Optional[str] = Query(None, description="Opaque cursor token for deep pagination"),
    db: Session = Depends(get_database),
) -> EventListResponse:
    try:
        return search_service.search_events(
            db=db,
            engine=engine,
            q=q,
            event_id=event_id,
            source_ip=source_ip,
            destination_ip=destination_ip,
            source_port=source_port,
            destination_port=destination_port,
            protocol=protocol,
            action=action,
            severity=severity,
            event_type=event_type,
            detected_format=detected_format,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
            offset=offset,
            search_after=search_after,
        )
    except Exception as exc:
        logger.error("Search API failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "status": "failed",
                "error": {
                    "code": "SEARCH_PROCESSING_ERROR",
                    "message": "An error occurred while executing the search query.",
                },
            },
        )


@router.get(
    "/health",
    response_model=OpenSearchHealthResponse,
    summary="OpenSearch Cluster & Index Health",
    description="Returns cluster availability, shard health, index alias mapping, and document statistics.",
)
def get_search_health() -> OpenSearchHealthResponse:
    health_data = search_service.get_health()
    return OpenSearchHealthResponse(**health_data)


@router.post(
    "/reindex",
    response_model=ReindexResponse,
    responses={
        status.HTTP_200_OK: {
            "model": ReindexResponse,
            "description": "Reindex operation completed or skipped.",
        },
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ErrorResponse,
            "description": "OpenSearch cluster unavailable for reindexing.",
        },
    },
    summary="Reindex OpenSearch from Authoritative MySQL Storage",
    description=(
        "**Administrative Rebuild:** Reads persisted events sequentially from MySQL, serializes them "
        "conforming to the explicit schema, and bulk indexes them into the OpenSearch alias."
    ),
)
def reindex_from_mysql(
    payload: Optional[ReindexRequest] = None,
    current_user: UserModel = Depends(require_permission("search:reindex")),
    db: Session = Depends(get_database),
) -> ReindexResponse:
    chunk_size = payload.batch_size if payload else None

    audit_service.record_event(
        db=db,
        action="REINDEX_STARTED",
        resource_type="index",
        user_id=current_user.id,
        username=current_user.username,
        status="SUCCESS",
        details={"batch_size": chunk_size},
    )

    result = search_service.reindex_from_mysql(db=db, batch_size=chunk_size)

    if result.get("status") == "unavailable":
        audit_service.record_event(
            db=db,
            action="REINDEX_FAILED",
            resource_type="index",
            user_id=current_user.id,
            username=current_user.username,
            status="FAILURE",
            details={"error": result.get("message")},
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "failed",
                "error": {
                    "code": "OPENSEARCH_UNAVAILABLE",
                    "message": result.get("message", "OpenSearch cluster is unreachable."),
                },
            },
        )

    audit_service.record_event(
        db=db,
        action="REINDEX_COMPLETED",
        resource_type="index",
        user_id=current_user.id,
        username=current_user.username,
        status="SUCCESS",
        details=result,
    )

    return ReindexResponse(**result)

