"""Security Audit Trail API Routes (Append-Only, Admin Query API)."""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ...audit.service import audit_service
from ...models.auth import UserModel
from ...schemas.auth import AuditLogListResponse, AuditLogResponse
from ..dependencies import get_database, require_permission

router = APIRouter(prefix="/audit", tags=["Security Audit Trail"])


@router.get(
    "",
    response_model=AuditLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="Query Immutable Security Audit Trail (Admin/Audit Protected)",
    description=(
        "Retrieves paginated, immutable audit logs with multi-dimensional filtering "
        "by user, action, resource type, status, and time window."
    ),
)
def get_audit_logs(
    user_id: Optional[str] = Query(None, description="Filter by user UUID"),
    username: Optional[str] = Query(None, description="Filter by username"),
    action: Optional[str] = Query(None, description="Filter by action: LOGIN_SUCCESS, USER_CREATED, etc."),
    resource_type: Optional[str] = Query(None, description="Filter by resource: user, event, session, etc."),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: SUCCESS, FAILURE, DENIED"),
    from_time: Optional[datetime] = Query(None, description="Earliest timestamp ISO-8601"),
    to_time: Optional[datetime] = Query(None, description="Latest timestamp ISO-8601"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: UserModel = Depends(require_permission("audit:read")),
    db: Session = Depends(get_database),
) -> AuditLogListResponse:
    items, total = audit_service.query_logs(
        db=db,
        user_id=user_id,
        username=username,
        action=action,
        resource_type=resource_type,
        status=status_filter,
        from_time=from_time,
        to_time=to_time,
        limit=limit,
        offset=offset,
    )

    page = (offset // limit) + 1 if limit > 0 else 1

    events = [
        AuditLogResponse(
            id=item.id,
            timestamp=item.timestamp,
            user_id=item.user_id,
            username=item.username,
            action=item.action,
            resource_type=item.resource_type,
            resource_id=item.resource_id,
            ip_address=item.ip_address,
            user_agent=item.user_agent,
            status=item.status,
            details=item.details,
        )
        for item in items
    ]

    return AuditLogListResponse(
        total=total,
        limit=limit,
        offset=offset,
        page=page,
        events=events,
    )
