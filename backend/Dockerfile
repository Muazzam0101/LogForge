# Production Dockerfile for LogForge ULPF Core Engine
# SIH 2026 Problem Statement ID: 26156 (NTRO)
# Theme: Blockchain & Cybersecurity

FROM python:3.12-slim as runtime

# Set environment variables for clean, reproducible python execution
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

# Security: Create non-root system user and group
RUN groupadd -r logforge && useradd -r -g logforge -d /app -s /sbin/nologin logforge

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY app/ /app/app/

# Set ownership to non-root user
RUN chown -R logforge:logforge /app

# Switch to non-root user for security hardening
USER logforge

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

EXPOSE 8000

# Entrypoint running Uvicorn ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--access-log"]
