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
| `/anomalies` | **Anomaly Intelligence** | Explainable AI/ML Isolation Forest detections, severity confidence tiers, forensic insights |
| `/integrity` | **Data Integrity** | Cryptographic verification console, live SHA-256 recalculation, Merkle batch anchoring, hash chain audit |
| `/alerts` | **Security Alerts** | Incident queue with severity tabs (Critical, High, Medium, Low) and triage table |
| `/integrations` | **Integrations** | OpenSearch, PostgreSQL, Kafka, AWS S3, Splunk connectors with standby states |
| `/reports` | **Reports** | Cryptographic SHA-256 audit proofs, forensic exports (JSONL, CSV, Parquet), CERT-In reports |
| `/status` | **System Status** | Framework diagnostic health center, air-gapped isolation, and cryptographic integrity monitor |
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

# Run full automated test suite (74 tests)
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

## 🗄️ Database Architecture & Storage (Phase 3 & 6)

LogForge leverages **MySQL / PostgreSQL** with **SQLAlchemy 2.x** and **Alembic** for tamper-evident, lossless security telemetry persistence and high-performance SQL analytics:

- **100% Lossless Raw Event Storage:** The exact original string received is stored unmodified in `raw_event` text column (no trimming, mutation, or re-encoding).
- **Separate Normalized JSONB:** The normalized canonical schema is stored in `normalized_event` (`jsonb` / `json`), and custom vendor extensions are stored in `additional_fields` (`jsonb` / `json`).
- **Cryptographic Tamper-Evidence:** Retains the immutable SHA-256 hash computed at ingestion in `sha256_hash`.
- **Comprehensive Indexing:** High-performance B-Tree indexes on `timestamp DESC`, `event_id`, `severity`, `log_format`, `source_ip`, `destination_ip`, `action`, and `sha256_hash`.
- **Safe Degradation:** If database storage is unreachable, the system fails gracefully with an opaque HTTP 503 error (`DATABASE_UNAVAILABLE`), strictly concealing connection strings, passwords, and SQL dialect details.

### API Endpoints Overview

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Core framework health status & registered parser catalog |
| `POST` | `/api/v1/logs/process` | Ingest single log, detect format, normalize, compute SHA-256, persist to DB |
| `POST` | `/api/v1/logs/batch` | Ingest log batch, detect formats, normalize, compute hashes, persist batch |
| `GET` | `/api/v1/logs` | Query stored logs (server-side pagination, free-text search `q`, filters) |
| `GET` | `/api/v1/logs/{event_id}` | Retrieve complete audit record by UUID for deep forensic inspection |
| `GET` | `/api/v1/analytics/overview` | Consolidated operational metrics, distributions, and time-series trends |
| `GET` | `/api/v1/analytics/summary` | Real-time KPI summary (total events, today's count, 24h volume, alerts) |
| `GET` | `/api/v1/analytics/distributions` | SQL-aggregated format, severity, action, and top IP distributions |
| `GET` | `/api/v1/analytics/trends` | Time-series volume intervals (24h hourly, 7d daily, 30d daily) |
| `GET` | `/api/v1/ml/status` | Active Isolation Forest model operational status & version |
| `POST` | `/api/v1/ml/train` | On-demand training / calibration of Isolation Forest on database events |
| `GET` | `/api/v1/ml/anomalies` | Paginated anomaly events list with joined security event context |
| `GET` | `/api/v1/ml/anomalies/summary` | Aggregate anomaly KPIs (normal, suspicious, highly anomalous, top sources) |
| `GET` | `/api/v1/ml/anomalies/{event_id}` | Detailed anomaly score and domain explainability justification for event |
| `GET` | `/api/v1/integrity/summary` | Live cryptographic integrity KPIs (verified, pending, anchored, tamper alerts) |
| `GET` | `/api/v1/integrity/{event_id}` | Retrieve cryptographic integrity record and audit proof status for an event |
| `POST` | `/api/v1/integrity/{event_id}/verify` | On-demand byte-level SHA-256 recalculation & tamper detection |
| `GET` | `/api/v1/integrity/{event_id}/blockchain` | On-chain Merkle proof verification and transaction anchor receipt |
| `POST` | `/api/v1/integrity/batches/create` | Group unbatched events into RFC 6962 binary Merkle tree batch |
| `POST` | `/api/v1/integrity/batches/anchor` | Commit Merkle batch root to EVM smart contract anchor |
| `GET` | `/api/v1/integrity/batches` | List all historical cryptographic Merkle batches and verification states |
| `GET` | `/api/v1/integrity/batches/{batch_id}` | Inspect Merkle batch root, event count, and on-chain transaction metadata |
| `POST` | `/api/v1/integrity/chain/verify` | Sequentially audit tamper-evident hash chain continuity across stored events |
| `GET` | `/api/v1/search/events` | High-speed distributed search, full-text exploration, multi-criteria filters, search_after |
| `GET` | `/api/v1/search/health` | OpenSearch cluster health, shard allocation, index alias status, doc counts |
| `POST` | `/api/v1/search/reindex` | Administrative streaming bulk reindex from authoritative MySQL into OpenSearch |

---

## 🧠 AI/ML Anomaly Detection Layer (Phase 7)

LogForge features a local, air-gapped, explainable AI/ML anomaly detection pipeline powered by **scikit-learn Isolation Forest**:

- **14-Dimensional Feature Engineering:** Numerical representation covering source/destination ports, privileged/remote port classifications, encoded protocol, enforcement action, severity levels, UTC temporal window, and internal/external ingress boundary directionality.
- **Normalized Anomaly Scores `[0.0, 1.0]`:** Normalized scoring mapped to three distinct confidence tiers:
  - `Normal` (`< 0.40`): Aligns with baseline operational traffic.
  - `Suspicious` (`0.40 - 0.69`): Elevated statistical deviation warranting review.
  - `Highly Anomalous` (`≥ 0.70`): Multi-vector outlier behavior flagged for immediate triage.
- **Domain-Specific Explainability:** Generates human-readable, domain-specific justifications (e.g. repeated perimeter blocks, off-hours execution, ingress crossing private boundary, SSH/RDP targeting) instead of opaque black-box numbers.
- **Non-Blocking Ingestion Hook:** Real-time inference safely wraps anomaly scoring so log ingestion and normalization throughput are 100% immune to model errors.
- **Model Persistence:** Fitted models and calibration metadata are serialized via `joblib` in `backend/models/`.

---

## ⛓️ Cryptographic Integrity & Blockchain Verification Layer (Phase 8)

LogForge enforces enterprise-grade mathematical tamper evidence and non-repudiation using a dual-tier cryptographic architecture:

```text
┌────────────────┐       ┌─────────────────┐       ┌───────────────────┐
│ Raw Event Log  │ ───▶  │   ULPF Engine   │ ───▶  │ MySQL Persistence │
└────────────────┘       └─────────────────┘       └───────────────────┘
                                   │                          │
                        SHA-256 Hashing            Stores raw_event byte-for-byte
                                   │                          │
                                   ▼                          ▼
                         ┌─────────────────┐       ┌───────────────────┐
                         │ event_integrity │ ◀──── │ Constant-Time     │
                         │ (Status/Chain)  │       │ Hash Verification │
                         └─────────────────┘       └───────────────────┘
                                   │
                           Merkle Batching
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ Merkle Tree     │ (RFC 6962 Binary Tree,
                         │ Root Hash       │  Audit Path Generation)
                         └─────────────────┘
                                   │
                          Blockchain Adapter
                                   │
                                   ▼
                         ┌─────────────────┐
                         │ IntegrityAnchor │ (EVM Smart Contract:
                         │ Smart Contract  │  Zero-Token, Gas-Optimized)
                         └─────────────────┘
```

### Off-Chain vs On-Chain Separation

In compliance with enterprise cybersecurity data privacy mandates, CERT-In compliance guidelines, and GDPR:
1. **Zero Raw Logs On-Chain:** Raw log strings, normalized JSON payloads, IPs, user identities, and infrastructure details **NEVER** leave MySQL or touch the blockchain.
2. **Cryptographic Proofs Only:** The blockchain ledger only stores:
   - 32-byte SHA-256 Merkle root (`bytes32`)
   - Batch identifier UUID (`string`)
   - Block timestamp (`uint256`)
   - Event count (`uint256`)
3. **Auditing via RFC 6962 Merkle Proofs:** Anyone with an event's raw SHA-256 hash and the Merkle audit path can mathematically verify inclusion against the immutable on-chain root in $O(\log N)$ time, without access to any other event in the batch.

### Smart Contract (`IntegrityAnchor.sol`)

Located at `backend/blockchain/contract/IntegrityAnchor.sol`:
- Minimal, gas-efficient Solidity contract (0.8.20+).
- Requires zero tokens, zero governance, and zero external oracles.
- Provides `anchorRoot(bytes32 root, string batchId, uint256 count)` and `verifyRoot(bytes32 root)`.
- Emits `RootAnchored` event indexed by batch ID and timestamp for instant SIEM indexer ingestion.

### Local Blockchain Setup & Configuration

LogForge supports local EVM nodes (Ganache, Hardhat, Anvil) or private consortia:

1. **Start a local EVM node:**
   ```bash
   # Using Hardhat
   npx hardhat node
   
   # Or using Anvil (Foundry)
   anvil
   
   # Or using Ganache
   npx ganache --port 8545
   ```

2. **Configure Environment Variables in `backend/.env`:**
   ```env
   BLOCKCHAIN_ENABLED=true
   BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
   BLOCKCHAIN_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
   BLOCKCHAIN_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
   BLOCKCHAIN_NETWORK=hardhat-local
   ```

3. **Air-Gapped / Offline Operation:**
   When `BLOCKCHAIN_ENABLED=false` (default), LogForge operates in pure offline mode. All cryptographic SHA-256 hashing, hash chaining, and Merkle tree generation function seamlessly with zero network overhead.

---

## 🔍 OpenSearch Scalability Layer (Phase 9)

LogForge implements a dual-layer storage architecture separating authoritative persistence from high-speed search and aggregation:

```text
                    ┌──────────────────┐
                    │    Next.js UI    │ (Logs Explorer, Analytics, System Health)
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  FastAPI Engine  │ (/api/v1/search/*)
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  ULPF Normalizer │ (Universal Event Schema)
                    └────────┬─────────┘
                             │
                ┌────────────┴────────────┐
                ▼                         ▼
        ┌──────────────┐          ┌──────────────┐
        │  MySQL 8.0   │          │  OpenSearch  │ (Distributed Search Index:
        │Source ofTruth│          │ Search/Stats │  logforge-events-v1 -> alias)
        └──────┬───────┘          └──────┬───────┘
               │                         │
               ▼                         ▼
        Forensic Audit             Fast Full-Text,
        & Blockchain               Filter Aggregations,
        Integrity Anchor           Deep Pagination
```

### Architectural Principles: MySQL vs OpenSearch

- **MySQL (System of Record):** Immutable, authoritative primary persistence. Losslessly retains byte-for-byte exact `raw_event` strings, normalized event JSON, unmapped vendor extensions, and cryptographic SHA-256 hashes. If OpenSearch ever loses data or corrupts an index, MySQL is the ground truth.
- **OpenSearch (Search & Analytics Projection):** High-speed read index optimized for complex boolean filtering, full-text queries across message/raw logs, rapid time-series aggregations, and `search_after` deep pagination.
- **Zero Ingestion Failures:** Ingestion throughput is decoupled from OpenSearch cluster state. If OpenSearch is slow or offline, events are committed to MySQL, and OpenSearch indexing fails safely without blocking ingestion.
- **Prevention of Field Explosion:** Mappings enforce `dynamic: "false"`. Dynamic sub-attributes in `additional_fields` are stored as objects without expanding the cluster cluster state field limit.

### Index Lifecycle & Alias Strategy

- **Underlying Index:** `logforge-events-v1`
- **Application Query Alias:** `logforge-events`
- Allows zero-downtime reindexing and index rotation (e.g. `logforge-events-v2` can be swapped atomically behind the alias).

### Transparent Fallback Mode

When `OPENSEARCH_ENABLED=false` or if the OpenSearch cluster is unreachable:
1. Search queries (`GET /api/v1/search/events`) transparently fall back to MySQL (`EventRepository.get_events`).
2. The response includes `search_engine: "mysql_fallback"` so callers and UI components can render operational indicators without interruption.
3. System Health page displays `OpenSearch: Disconnected (Fallback Active)`.

### Local & Docker Deployment

1. **Start with Docker Compose:**
   ```bash
   docker-compose up -d opensearch
   ```
   Configured with single-node discovery, 512MB heap limit (`-Xms512m -Xmx512m`), and disabled security plugin for local dev.

2. **Environment Configuration (`backend/.env`):**
   ```env
   OPENSEARCH_ENABLED=true
   OPENSEARCH_URL=http://localhost:9200
   OPENSEARCH_INDEX=logforge-events
   OPENSEARCH_BULK_SIZE=500
   ```

3. **Reindex from Authoritative Storage:**
   To populate or rebuild OpenSearch from existing MySQL events:
   ```bash
   curl -X POST http://127.0.0.1:8000/api/v1/search/reindex -H "Content-Type: application/json" -d '{"batch_size": 500}'
   ```

