# LogForge Core ULPF Engine

**Universal Log Pre-processing Framework (ULPF)**  
*SIH 2026 Problem Statement ID: 26156 · National Technical Research Organisation (NTRO)*  
*Theme: Blockchain & Cybersecurity*

---

## 1. Overview

The **LogForge Core Engine** is a high-performance, vendor-neutral log ingestion, format detection, parsing, and normalization framework designed specifically for heterogeneous cybersecurity environments.

It ingests raw, unformatted events from network devices, firewalls, operating systems, cloud providers, and endpoint sensors, transforming them into a standardized, lossless, analytics-ready representation conforming to the **Universal Event Schema (UES)**.

---

## 2. Core Architectural Principles

1. **Decoupled Processing Engine**: The core processing service (`ULPFEngine`) has **zero dependency on HTTP or FastAPI**. It can be imported and executed in CLI tools, background workers, streaming pipelines (e.g. Kafka/RabbitMQ), or directly in Python code:
   ```python
   from app.services.processing_service import ulpf_engine
   result = ulpf_engine.process_event(raw_log)
   ```
2. **Lossless Preservation**: The exact raw event string (`raw_event`) is preserved byte-for-byte without mutation or trimming. Unmapped vendor-specific attributes are preserved in `additional_fields`.
3. **Cryptographic Integrity & Traceability**: Every event is assigned a unique UUIDv4 `event_id` and a SHA-256 cryptographic digest of the raw event bytes (`raw_event_hash`), providing a tamper-evident foundation for future blockchain verification.
4. **Deterministic Format Detection**: Format classification into JSON, CEF, or Syslog is 100% deterministic and explainable without AI guesswork.
5. **Plug-and-Play Parser Registry**: New vendor-specific or custom format parsers can be registered dynamically at runtime without modifying the engine or API layer.

---

## 3. Data Processing Pipeline

```text
RAW LOG
   ↓
FORMAT DETECTION (FormatDetector: JSON, CEF, Syslog, Unknown)
   ↓
PARSER REGISTRY (Resolves BaseParser plugin)
   ↓
PARSER (Extracts structured attributes & extensions)
   ↓
FIELD NORMALIZATION (Synonym resolution & canonicalization)
   ↓
SCHEMA VALIDATION (Pydantic v2 Universal Event Schema)
   ↓
CRYPTOGRAPHIC HASHING (SHA-256 raw event digest)
   ↓
LOSSLESS PROCESSING RESULT (event_id + normalized_event + raw_event + hash)
```

---

## 4. Universal Event Schema (UES)

The canonical event model (`NormalizedEvent`) provides standard cybersecurity abstractions:

- **Core Context**: `timestamp`, `event_type`, `event_category`, `action`, `severity`, `severity_code`, `message`
- **Source Endpoint**: `source.ip`, `source.port`, `source.hostname`, `source.mac`, `source.user`
- **Destination Endpoint**: `destination.ip`, `destination.port`, `destination.hostname`, `destination.mac`, `destination.user`
- **Network Attributes**: `network.protocol`, `network.transport`, `network.direction`, `network.session_id`
- **Device Attributes**: `device.hostname`, `device.ip`, `device.vendor`, `device.product`, `device.version`
- **User Attributes**: `user.name`, `user.id`, `user.domain`, `user.email`, `user.role`
- **Parser Telemetry**: `parser.parser_name`, `parser.format_detected`, `parser.parse_time_ms`
- **Extensibility & Lossless Retention**: `additional_fields` (retains all unmapped vendor-specific keys)

---

## 5. Quickstart & Local Setup

### Prerequisites
- Python 3.11+ (tested on Python 3.12.1)

### Virtual Environment Setup
```bash
# Create virtual environment
python -m venv venv

# Activate on Windows PowerShell
.\venv\Scripts\Activate.ps1

# Activate on Linux / macOS
source venv/bin/activate

# Install dependencies
pip install -r requirements-dev.txt
```

### Running the API Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive OpenAPI documentation is available at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### Running Unit & Integration Tests
```bash
pytest tests -v
```

---

## 6. API Reference

### Health Check
`GET /health`

**Response:**
```json
{
  "status": "healthy",
  "service": "LogForge ULPF Core Engine",
  "version": "0.1.0",
  "registered_parsers": [
    "cef_parser",
    "json_parser",
    "syslog_parser"
  ]
}
```

### Process Single Log
`POST /api/v1/logs/process`

**Request:**
```json
{
  "raw_log": "CEF:0|CheckPoint|VPN-1 & FireWall-1|CheckPoint|drop|Drop packet|High|src=198.51.100.25 dst=203.0.113.50 spt=49152 dpt=22 proto=tcp act=drop suser=admin",
  "source_hint": "perimeter_firewall"
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "event_id": "c71a396e-5a02-4c25-bb3e-6323cf181467",
  "format_detected": "cef",
  "normalized_event": {
    "timestamp": null,
    "event_type": "drop",
    "event_category": null,
    "action": "block",
    "severity": "high",
    "severity_code": null,
    "message": "Drop packet",
    "source": {
      "ip": "198.51.100.25",
      "port": 49152,
      "mac": null,
      "hostname": null,
      "domain": null,
      "user": "admin",
      "bytes": null,
      "packets": null
    },
    "destination": {
      "ip": "203.0.113.50",
      "port": 22,
      "mac": null,
      "hostname": null,
      "domain": null,
      "user": null,
      "bytes": null,
      "packets": null
    },
    "network": {
      "protocol": "tcp",
      "transport": null,
      "direction": null,
      "session_id": null
    },
    "device": {
      "hostname": null,
      "ip": null,
      "vendor": "CheckPoint",
      "product": "VPN-1 & FireWall-1",
      "version": "CheckPoint"
    },
    "user": null,
    "parser": {
      "parser_name": "cef_parser",
      "format_detected": "cef",
      "parser_version": "1.0.0",
      "parse_time_ms": 0.082
    },
    "additional_fields": {
      "cef_version": "0"
    }
  },
  "raw_event": "CEF:0|CheckPoint|VPN-1 & FireWall-1|CheckPoint|drop|Drop packet|High|src=198.51.100.25 dst=203.0.113.50 spt=49152 dpt=22 proto=tcp act=drop suser=admin",
  "raw_event_hash": "e6a0d24c3a2a677322987a0dbf03b8bfeb85387431f47847eb10fe87d7b375b4",
  "processing_metadata": {
    "ingested_at": "2026-09-06T10:45:00.000Z",
    "processing_time_ms": 0.231,
    "engine_version": "0.1.0"
  },
  "error": null
}
```

### Error Response (Malformed / Unknown Log)
`POST /api/v1/logs/process` with invalid payload returns `422 Unprocessable Content`:
```json
{
  "status": "failed",
  "error": {
    "code": "INVALID_LOG_FORMAT",
    "message": "Unable to detect supported log format (expected JSON, CEF, or Syslog)",
    "details": {
      "event_id": "7b0b6910-18e4-4d89-b883-9b9aa5cb2091",
      "format_detected": "unknown",
      "raw_event_hash": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    }
  }
}
```

### Process Batch
`POST /api/v1/logs/batch`

Accepts `{ "raw_logs": ["...", "..."], "source_hint": "..." }` and returns array of processing results.

---

## 7. How to Add a New Parser Plugin

Adding a parser requires zero modifications to existing parsers or downstream services:

1. **Create the parser class** inheriting from `BaseParser`:
   ```python
   from app.parsers.base import BaseParser

   class SnortAlertParser(BaseParser):
       parser_name = "snort_alert_parser"
       supported_format = "snort"
       version = "1.0.0"

       def can_parse(self, raw_log: str) -> bool:
           return "[**] [" in raw_log

       def parse(self, raw_log: str) -> dict:
           # Extract attributes
           return {
               "action": "block",
               "message": "ET MALWARE Suspicious Inbound Connection",
               "src_ip": "10.0.0.1",
               "dst_ip": "192.168.1.5",
           }
   ```

2. **Register it in the `ParserRegistry`**:
   ```python
   from app.parsers.registry import parser_registry
   parser_registry.register(SnortAlertParser())
   ```

The `ULPFEngine` will now automatically detect, select, and process logs using your new parser!
