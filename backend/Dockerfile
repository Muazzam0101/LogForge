# Production Dockerfile for LogForge ULPF Core Engine
# SIH 2026 Problem Statement ID: 26156 (NTRO)
# Theme: Blockchain & Cybersecurity

FROM python:3.12-slim AS runtime

# Set environment variables for clean, reproducible python execution
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Security: Create non-root system user and group
RUN groupadd -r logforge && useradd -r -g logforge -d /app -s /bin/sh logforge

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code, migrations, and entrypoint
COPY app/ /app/app/
COPY alembic/ /app/alembic/
COPY alembic.ini /app/alembic.ini
COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh && chown -R logforge:logforge /app

# Switch to non-root user for security hardening
USER logforge

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

EXPOSE 8000

# Entrypoint running migrations and Uvicorn ASGI server
ENTRYPOINT ["/app/entrypoint.sh"]
