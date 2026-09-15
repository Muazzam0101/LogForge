"""Streaming and Kafka Pipeline API Routes."""
from fastapi import APIRouter, status
from ...schemas.streaming import StreamingHealthResponse
from ...streaming.admin import kafka_admin_service

router = APIRouter(prefix="/streaming", tags=["Streaming & Kafka Pipeline"])


@router.get(
    "/health",
    response_model=StreamingHealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Real-Time Kafka Cluster & Stream Health Telemetry",
    description=(
        "Retrieves real-time diagnostics of the Apache Kafka event broker, "
        "including cluster connectivity, active brokers, topic partition states, "
        "and consumer group status."
    ),
)
async def get_streaming_health() -> StreamingHealthResponse:
    """Returns Kafka cluster health and partition availability telemetry."""
    health_data = kafka_admin_service.get_cluster_health()
    return StreamingHealthResponse(**health_data)
