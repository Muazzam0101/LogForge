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
├── app/
│   ├── layout.tsx                 # Root layout with Plus Jakarta Sans & DashboardShell
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
├── components/
│   ├── layout/
│   │   ├── DashboardShell.tsx     # Persistent layout shell
│   │   ├── Sidebar.tsx            # Next.js Link navigation with pathname detection
│   │   └── TopBar.tsx             # Global search, shortcut (Ctrl K), notifications, and profile
│   ├── context/
│   │   └── ModalContext.tsx       # Global modal state management
│   ├── ui/
│   │   └── ScrollReveal.tsx       # Native IntersectionObserver fade-in scroll reveal
│   ├── dashboard/                 # Dashboard components (Hero, Status, Trends, Sources, etc.)
│   └── modals/                    # Modals (UploadLogsModal, ExplorePipelineModal, AddSourceModal)
└── package.json
```

---

## 🚀 Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
