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

export interface StoredEventSummary {
  id: number;
  event_id: string;
  timestamp: string | null;
  detected_format: string;
  source_ip: string | null;
  destination_ip: string | null;
  source_port: number | null;
  destination_port: number | null;
  protocol: string | null;
  action: string | null;
  severity: string | null;
  raw_event: string;
  sha256_hash: string;
  created_at: string;
}

export interface StoredEventDetail extends StoredEventSummary {
  normalized_event: NormalizedEvent | null;
  additional_fields: Record<string, unknown> | null;
}

export interface LogListResponse {
  total: number;
  limit: number;
  offset: number;
  events: StoredEventSummary[];
}

export interface LogQueryParams {
  limit?: number;
  offset?: number;
  q?: string;
  event_id?: string;
  detected_format?: string;
  severity?: string;
  action?: string;
  source_ip?: string;
  destination_ip?: string;
  protocol?: string;
  start_time?: string;
  end_time?: string;
}

export type LogFormatFilter = "" | "json" | "cef" | "syslog" | "unknown";
export type LogSeverityFilter = "" | "critical" | "high" | "medium" | "low" | "info" | "informational";
export type LogActionFilter = "" | "allow" | "block" | "deny" | "drop" | "other";
export type LogProtocolFilter = "" | "tcp" | "udp" | "icmp" | "other";

export interface LogFilterState {
  q: string;
  detected_format: string;
  severity: string;
  action: string;
  protocol: string;
  source_ip: string;
  destination_ip: string;
  start_time: string;
  end_time: string;
}

export interface AnalyticsSummary {
  total_events: number;
  events_today: number;
  events_last_24h: number;
  high_severity_events: number;
  critical_severity_events: number;
  blocked_events: number;
  active_sources_count: number;
}

export interface DistributionItem {
  name: string;
  count: number;
  percentage: number;
}

export interface TopEndpointItem {
  ip: string;
  count: number;
}

export interface TrendPoint {
  timestamp: string;
  ingested: number;
  normalized: number;
  alerts: number;
}

export interface AnalyticsDistributions {
  format_distribution: DistributionItem[];
  severity_distribution: DistributionItem[];
  action_distribution: DistributionItem[];
  top_source_ips: TopEndpointItem[];
  top_destination_ips: TopEndpointItem[];
}

export interface AnalyticsOverview {
  summary: AnalyticsSummary;
  distributions: AnalyticsDistributions;
  trends: TrendPoint[];
  time_range: string;
}


