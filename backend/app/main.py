from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


import time
from .api.routes import analytics, audit, auth, health, integrity, logs, ml, search, streaming, system, users


from .core.config import settings
from .core.logging import logger
from .search.service import search_service
from .streaming.admin import kafka_admin_service
from .streaming.producer import kafka_producer_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("LogForge ULPF Engine v%s initialized successfully", settings.VERSION)
    if settings.OPENSEARCH_ENABLED:
        try:
            search_service.initialize_index()
        except Exception as exc:
            logger.warning("OpenSearch index initialization deferred: %s", exc)
    if settings.KAFKA_ENABLED:
        try:
            kafka_admin_service.ensure_topics()
        except Exception as exc:
            logger.warning("Kafka topic initialization deferred: %s", exc)
    yield
    try:
        kafka_producer_service.flush(timeout=2.0)
    except Exception:
        pass
    logger.info("LogForge ULPF Engine shut down cleanly")



app = FastAPI(
    title="LogForge · Universal Log Pre-processing Framework (ULPF)",
    description=(
        "Production-grade cybersecurity log ingestion, format detection, "
        "parsing, normalization, and standardization engine for NTRO SIH 2026. "
        "Transforms heterogeneous raw security events into the Universal Event Schema (UES) losslessly."
    ),
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Standardized validation error response preventing stack trace leakage."""
    logger.warning("Validation error on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "failed",
            "error": {
                "code": "REQUEST_VALIDATION_ERROR",
                "message": "Request payload validation failed",
                "details": jsonable_encoder(exc.errors()),
            },
        },
    )



@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(
    request: Request, exc: SQLAlchemyError
) -> JSONResponse:
    """Safe database exception handler concealing internals, credentials, and SQL."""
    logger.error("Database error on %s: %s", request.url.path, exc.__class__.__name__)
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={
            "status": "failed",
            "error": {
                "code": "DATABASE_UNAVAILABLE",
                "message": "The persistent database is currently unavailable. Please check database connectivity.",
            },
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Safe fallback exception handler concealing internals from external callers."""
    logger.error("Unhandled exception on %s: %s", request.url.path, str(exc), exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "failed",
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred during processing",
            },
        },
    )


@app.middleware("http")
async def performance_telemetry_middleware(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    dur_ms = (time.perf_counter() - start) * 1000.0
    response.headers["X-Response-Time-Ms"] = f"{dur_ms:.2f}"
    return response


# Include Routers
app.include_router(health.router)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(users.router, prefix=settings.API_V1_PREFIX)
app.include_router(audit.router, prefix=settings.API_V1_PREFIX)
app.include_router(logs.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(ml.router, prefix=settings.API_V1_PREFIX)
app.include_router(integrity.router, prefix=settings.API_V1_PREFIX)
app.include_router(search.router, prefix=settings.API_V1_PREFIX)
app.include_router(streaming.router, prefix=settings.API_V1_PREFIX)
app.include_router(system.router, prefix=settings.API_V1_PREFIX)




