from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from .api.routes import analytics, health, logs, ml
from .core.config import settings
from .core.logging import logger


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("LogForge ULPF Engine v%s initialized successfully", settings.VERSION)
    yield
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
                "details": exc.errors(),
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


# Include Routers
app.include_router(health.router)
app.include_router(logs.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(ml.router, prefix=settings.API_V1_PREFIX)

