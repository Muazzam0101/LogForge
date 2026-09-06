from fastapi import APIRouter, Depends, HTTPException, status
from ...schemas.event import ProcessingResult
from ...schemas.ingestion import BatchLogProcessRequest, LogProcessRequest
from ...schemas.response import BatchProcessResponse, ErrorResponse
from ...services.processing_service import ULPFEngine
from ..dependencies import get_ulpf_engine

router = APIRouter(prefix="/logs", tags=["Log Ingestion & Normalization"])


@router.post(
    "/process",
    response_model=ProcessingResult,
    responses={
        status.HTTP_200_OK: {
            "model": ProcessingResult,
            "description": "[SCHEMA BLUEPRINT · 200 SUCCESS] Static OpenAPI specification for successful processing. (Live runtime result appears in the 'Server response' section above after clicking Execute).",
        },
        status.HTTP_422_UNPROCESSABLE_ENTITY: {
            "model": ErrorResponse,
            "description": "[SCHEMA BLUEPRINT · 422 ERROR] Static OpenAPI error specification returned when raw log format is unidentifiable or malformed.",
        },
    },
    summary="Process and Normalize Single Raw Log",
    description=(
        "**Core Ingestion Pipeline:** Ingests a raw log line, deterministically detects format, "
        "selects plugin parser, normalizes into Universal Event Schema (UES), calculates SHA-256 hash, "
        "and losslessly preserves all original and unmapped fields.\n\n"
        "💡 *Note: The **'Responses'** section below provides the static API contract / schema blueprint for client developers. "
        "Your live execution results appear dynamically in the **'Server response'** block above.*"
    ),
)
def process_log(
    payload: LogProcessRequest,
    engine: ULPFEngine = Depends(get_ulpf_engine),
) -> ProcessingResult:
    result = engine.process_event(
        raw_log=payload.raw_log,
        source_hint=payload.source_hint,
    )

    if result.status == "failed":
        err_code = result.error.get("code") if result.error else "PROCESSING_ERROR"
        err_msg = result.error.get("message") if result.error else "Failed to process log"
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "status": "failed",
                "error": {
                    "code": err_code,
                    "message": err_msg,
                    "details": {
                        "event_id": result.event_id,
                        "format_detected": result.format_detected,
                        "raw_event_hash": result.raw_event_hash,
                    },
                },
            },
        )

    return result


@router.post(
    "/batch",
    response_model=BatchProcessResponse,
    responses={
        status.HTTP_200_OK: {
            "model": BatchProcessResponse,
            "description": "[SCHEMA BLUEPRINT · 200 SUCCESS] Static OpenAPI specification for batch processing outcomes. (Live runtime result appears in 'Server response' above).",
        },
    },
    summary="Process and Normalize Batch of Raw Logs",
    description=(
        "**Batch Ingestion:** Ingests an array of raw log lines (up to 500) and processes each into Universal Event Schema representation.\n\n"
        "💡 *Note: The **'Responses'** section below provides the static API contract / schema blueprint for client developers. "
        "Your live execution results appear dynamically in the **'Server response'** block above.*"
    ),
)
def process_batch(
    payload: BatchLogProcessRequest,
    engine: ULPFEngine = Depends(get_ulpf_engine),
) -> BatchProcessResponse:
    results = engine.process_batch(
        raw_logs=payload.raw_logs,
        source_hint=payload.source_hint,
    )

    successful = sum(1 for r in results if r.status == "success")
    failed = len(results) - successful

    return BatchProcessResponse(
        status="success" if failed == 0 else "partial_success",
        total=len(results),
        successful=successful,
        failed=failed,
        results=results,
    )
