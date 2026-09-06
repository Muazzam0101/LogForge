/**
 * Universal Log Pre-processing Framework (ULPF) TypeScript Definitions
 * Aligned 1-to-1 with Python FastAPI Pydantic v2 schemas.
 */

export interface EndpointEntity {
  ip: string | null;
  port: number | null;
  mac: string | null;
  hostname: string | null;
  domain: string | null;
  user: string | null;
  bytes: number | null;
  packets: number | null;
}

export interface NetworkContext {
  protocol: string | null;
  transport: string | null;
  direction: string | null;
  session_id: string | null;
}

export interface DeviceContext {
  hostname: string | null;
  ip: string | null;
  vendor: string | null;
  product: string | null;
  version: string | null;
}

export interface UserContext {
  name: string | null;
  id: string | null;
  domain: string | null;
  email: string | null;
  role: string | null;
}

export interface ParserMetadata {
  parser_name: string;
  format_detected: string;
  parser_version: string;
  parse_time_ms: number | null;
}

export interface NormalizedEvent {
  timestamp: string | null;
  event_type: string | null;
  event_category: string | null;
  action: string | null;
  severity: string | null;
  severity_code: number | null;
  message: string | null;
  source: EndpointEntity | null;
  destination: EndpointEntity | null;
  network: NetworkContext | null;
  device: DeviceContext | null;
  user: UserContext | null;
  parser: ParserMetadata | null;
  additional_fields: Record<string, unknown>;
}

export interface ProcessingMetadata {
  ingested_at: string;
  processing_time_ms: number;
  engine_version: string;
}

export interface ProcessingErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ProcessingResult {
  status: "success" | "failed";
  event_id: string;
  format_detected: string;
  normalized_event: NormalizedEvent | null;
  raw_event: string;
  raw_event_hash: string;
  processing_metadata: ProcessingMetadata;
  error: ProcessingErrorDetail | null;
}

export interface LogProcessRequest {
  raw_log: string;
  source_hint?: string;
}

export interface BatchLogProcessRequest {
  raw_logs: string[];
  source_hint?: string;
}

export interface BatchProcessResponse {
  status: string;
  total: number;
  successful: number;
  failed: number;
  results: ProcessingResult[];
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  registered_parsers: string[];
}

export interface ApiClientError {
  status: "failed";
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
