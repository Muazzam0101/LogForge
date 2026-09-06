# LogForge — Universal Log Intelligence Platform

> **Forge raw logs into security intelligence.**  
> Smart India Hackathon (SIH) 2026 · Problem Statement ID: 26156  
> **Organization:** National Technical Research Organisation (NTRO)  
> **Theme:** Blockchain & Cybersecurity  

---

## 🛡️ Project Overview

Modern enterprise environments generate massive volumes of logs across heterogeneous sources: firewalls, routers, Windows/Linux endpoints, cloud platforms, containers, and IoT hardware. Each system outputs proprietary or standard formats (Syslog, JSON, XML, CSV, CEF, LEEF, EVTX).

**LogForge** is a Universal Log Pre-processing Framework (ULPF) that acts as the standardized, lossless normalization layer between diverse log-emitting devices and downstream SIEM, Data Lake, and AI/ML cybersecurity systems.

### Core Principles
1. **Heterogeneous Ingestion:** Seamlessly capture logs from any network device or operating system.
2. **Deterministic Parsing:** High-speed grammar parsers for format auto-discovery.
3. **Lossless Raw Retention:** Preserves original raw event payloads verbatim with cryptographic SHA-256 integrity hash verification.
4. **Universal Common Schema (ULPF-ECS):** Normalizes disparate event fields into unified security taxonomies.
5. **Air-Gapped Readiness:** Built for isolated enterprise networks with zero external cloud dependencies.
6. **AI/ML & SIEM Ready:** Downstream streaming to OpenSearch, PostgreSQL, and vector stores for anomaly detection.

---

## 🛣️ Senior Developer Routed Architecture

Every module is an independent Next.js App Router page with real URL routing and a persistent shell:

| Route | View | Description |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Hero pipeline, 4-stage isometric cards, System Status, KPIs, Event Trends, Log Sources, Recent Events, Alerts |
| `/ingestion` | **Log Ingestion** | Live socket listeners (UDP/TCP 514, TLS 6514), batch file dropzone, ingestion job queues |
| `/explorer` | **Logs Explorer** | KQL query builder, schema filters, field explorer, query execution with empty states |
| `/sources` | **Sources & Parsers** | Built-in parser catalog (Cisco, Linux, Windows EVTX, Snort, Cloud) & device inventory |
| `/threats` | **Threat Analytics** | MITRE ATT&CK enterprise matrix correlation and AI/ML anomaly scoring in standby |
| `/alerts` | **Security Alerts** | Incident queue with severity tabs (Critical, High, Medium, Low) and triage table |
| `/integrations` | **Integrations** | OpenSearch, PostgreSQL, Kafka, AWS S3, Splunk connectors with standby states |
| `/reports` | **Reports** | Cryptographic SHA-256 audit proofs, forensic exports (JSONL, CSV, Parquet), CERT-In reports |
| `/status` | **System Status** | Framework diagnostic health center and air-gapped isolation verification |
| `/settings` | **Settings** | ULPF common schema definitions, retention policies, air-gapped security controls |

---

## 🎨 Visual Design Language & Micro-Animations

- **Visual Inspiration:** Modern enterprise SaaS SOC dashboard aesthetic with a light theme.
- **Theme:** Clean white & ambient off-white surfaces (`#f8fafc`), soft rounded cards (`rounded-3xl` & `rounded-2xl`), subtle shadows, and royal purple (`#6366f1` / `#7048e8`) brand accents.
- **Animations:**
  - `ScrollReveal`: Native hardware-accelerated intersection observer reveal across all pages.
  - `animate-wave`: Header greeting waving hand.
  - `animate-shimmer`: Hero badge light sweep.
  - `animate-calm-pulse`: Status indicator & icon breathing pulse.
  - `animate-radar-ring`: Empty state radar telemetry sweep.
  - `animate-spin-slow`: Technical slow 35s rotation on donut telemetry ring.

---

## 📁 Project Structure

```text
LogForge/
├── backend/                       # Core ULPF Engine (Python 3.12 + FastAPI + Pydantic v2)
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint, lifespan, CORS, error handling
│   │   ├── api/                   # API routes (/health, /api/v1/logs/process, /api/v1/logs/batch)
│   │   ├── core/                  # Configuration & structured logging
│   │   ├── normalization/         # Canonical field mapping & EventNormalizer
│   │   ├── parsers/               # BaseParser, ParserRegistry, FormatDetector, JSON/CEF/Syslog
│   │   ├── schemas/               # Universal Event Schema (UES), Ingestion, Response envelopes
│   │   ├── services/              # ULPFEngine decoupled processing service
│   │   └── utils/                 # SHA-256 cryptographic hashing & UUIDv4 generation
│   ├── tests/                     # 40 comprehensive unit, integration & edge-case pytest tests
│   ├── Dockerfile                 # Hardened, non-root air-gapped container image
│   ├── requirements.txt           # Production dependencies
│   └── requirements-dev.txt       # Dev & test dependencies
├── app/                           # Next.js App Router (10 dedicated routes)
│   ├── layout.tsx                 # Root layout with Outfit & JetBrains Mono fonts
│   ├── page.tsx                   # Route: / (Dashboard)
│   ├── ingestion/page.tsx         # Route: /ingestion
│   ├── explorer/page.tsx          # Route: /explorer
│   ├── sources/page.tsx           # Route: /sources
│   ├── threats/page.tsx           # Route: /threats
│   ├── alerts/page.tsx            # Route: /alerts
│   ├── integrations/page.tsx      # Route: /integrations
│   ├── reports/page.tsx           # Route: /reports
│   ├── status/page.tsx            # Route: /status
│   └── settings/page.tsx          # Route: /settings
├── components/                    # Frontend UI design system components
└── package.json
```

---

## 🚀 Getting Started

### 1. Frontend Web UI (Next.js)
```bash
# In the repository root
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 2. Backend Core ULPF Engine (Python FastAPI + MySQL / PostgreSQL)
```bash
# Setup virtual environment
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1    # On Windows PowerShell (or source venv/bin/activate on Linux)
pip install -r requirements.txt -r requirements-dev.txt

# Configure environment variables (MySQL 8.0 default)
copy .env.example .env

# Apply Alembic database migrations
alembic upgrade head

# Run full automated test suite (66 tests)
pytest -v

# Start the backend server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

---

## 🐳 Running with Docker Compose

To start the complete LogForge stack (PostgreSQL database, FastAPI backend, and Next.js frontend) with a single command:

```bash
# In the repository root
docker-compose up --build
```

Services initialized:
- **PostgreSQL 16**: Port `5432` with healthcheck and persistent volume `postgres_data`.
- **LogForge Backend**: Port `8000` (auto-runs `alembic upgrade head` before booting FastAPI).
- **LogForge Frontend**: Port `3000` (Next.js production container).

To stop the stack:
```bash
docker-compose down
```

---

## 🗄️ Database Architecture & Storage (Phase 3)

LogForge leverages **PostgreSQL** with **SQLAlchemy 2.x** and **Alembic** for tamper-evident, lossless security telemetry persistence:

- **100% Lossless Raw Event Storage:** The exact original string received is stored unmodified in `raw_event` text column (no trimming, mutation, or re-encoding).
- **Separate Normalized JSONB:** The normalized canonical schema is stored in `normalized_event` (`jsonb` / `json`), and custom vendor extensions are stored in `additional_fields` (`jsonb` / `json`).
- **Cryptographic Tamper-Evidence:** Retains the immutable SHA-256 hash computed at ingestion in `sha256_hash`.
- **Comprehensive Indexing:** High-performance B-Tree indexes on `timestamp DESC`, `event_id`, `severity`, `log_format`, `source_ip`, `destination_ip`, `action`, and `sha256_hash`.
- **Safe Degradation:** If PostgreSQL is unreachable, the system fails gracefully with an opaque HTTP 503 error (`DATABASE_UNAVAILABLE`), strictly concealing connection strings, passwords, and SQL dialect details.

### API Endpoints Overview

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Core framework health status |
| `POST` | `/api/v1/logs/process` | Ingest single log, detect format, normalize, compute SHA-256, persist to DB |
| `POST` | `/api/v1/logs/batch` | Ingest log batch, detect formats, normalize, compute hashes, persist batch |
| `GET` | `/api/v1/logs` | Query stored logs (server-side pagination, filters: severity, format, IP, action, dates) |
| `GET` | `/api/v1/logs/{event_id}` | Retrieve complete audit record by UUID for deep forensic inspection |
