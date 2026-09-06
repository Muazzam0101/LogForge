from fastapi import APIRouter
from ...core.config import settings
from ...parsers.registry import parser_registry
from ...schemas.response import HealthResponse

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Engine Health Check",
    description="Returns service availability, version, and active registered log parsers.",
)
def get_health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        registered_parsers=parser_registry.list_parsers(),
    )
