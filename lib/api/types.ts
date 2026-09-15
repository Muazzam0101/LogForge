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

export interface AnomalyDetail {
  event_id: string;
  anomaly_score: number;
  classification: "Normal" | "Suspicious" | "Highly Anomalous" | string;
  explanation: string;
  model_name: string;
  model_version: string;
  features_snapshot?: Record<string, number> | null;
  created_at: string;
}

export interface StoredEventDetail extends StoredEventSummary {
  normalized_event: NormalizedEvent | null;
  additional_fields: Record<string, unknown> | null;
  anomaly?: AnomalyDetail | null;
}


export interface LogListResponse {
  total: number;
  limit: number;
  offset: number;
  page?: number;
  events: StoredEventSummary[];
  search_engine?: "opensearch" | "mysql" | "mysql_fallback" | string;
  search_after?: string | null;
}

export interface LogQueryParams {
  limit?: number;
  offset?: number;
  engine?: "mysql" | "opensearch" | "auto";
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
  search_after?: string;
}

export interface OpenSearchHealth {
  status: "CONNECTED" | "DISCONNECTED" | "DISABLED" | "DEGRADED" | string;
  enabled: boolean;
  cluster_name?: string;
  cluster_status?: string;
  index_name?: string;
  alias_name?: string;
  index_exists?: boolean;
  document_count?: number;
  message?: string;
}

export interface ReindexResponse {
  status: string;
  total_mysql_events: number;
  indexed_documents: number;
  failed_documents: number;
  duration_seconds: number;
  message?: string;
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

export interface AnomalyListItem {
  id: number;
  event_id: string;
  anomaly_score: number;
  classification: "Normal" | "Suspicious" | "Highly Anomalous" | string;
  explanation: string;
  created_at: string;
  source_ip: string | null;
  destination_ip: string | null;
  destination_port: number | null;
  protocol: string | null;
  action: string | null;
  severity: string | null;
}

export interface AnomalyListResponse {
  total: number;
  page: number;
  page_size: number;
  items: AnomalyListItem[];
}

export interface AnomalousSource {
  source_ip: string;
  count: number;
  avg_score: number;
  max_score: number;
}

export interface AnomalySummaryResponse {
  total_scored_events: number;
  normal_count: number;
  suspicious_count: number;
  highly_anomalous_count: number;
  average_anomaly_score: number;
  model_name: string;
  model_version: string;
  is_trained: boolean;
  last_trained_at: string | null;
  top_anomalous_sources: AnomalousSource[];
}

export interface ModelTrainingRequest {
  contamination?: number;
  max_samples?: number;
  rescore_existing?: boolean;
}

export interface ModelTrainingResponse {
  status: string;
  message: string;
  model_name: string;
  model_version: string;
  events_trained: number;
  anomalies_scored: number;
  contamination: number;
  trained_at: string;
}

export interface ModelStatusResponse {
  is_trained: boolean;
  model_name: string;
  model_version: string;
  contamination: number;
  samples_count?: number | null;
  features_count?: number | null;
  trained_at?: string | null;
}

export interface IntegritySummary {
  total_records: number;
  verified_count: number;
  tampered_count: number;
  unverified_count: number;
  blockchain_anchored_count: number;
  blockchain_status: string;
  blockchain_network?: string | null;
  latest_root_hash?: string | null;
  last_anchored_at?: string | null;
}

export interface EventVerificationResult {
  event_id: string;
  integrity: "VALID" | "TAMPERED" | "NOT_FOUND" | "VERIFICATION_ERROR";
  hash_algorithm: string;
  stored_hash: string | null;
  calculated_hash: string | null;
  verified_at: string;
  blockchain_anchored: boolean;
  blockchain_status: string;
  batch_id?: string | null;
  root_hash?: string | null;
  transaction_hash?: string | null;
  details?: string | null;
}

export interface IntegrityRecord {
  event_id: string;
  sha256_hash: string;
  hash_algorithm: string;
  previous_hash?: string | null;
  chain_hash?: string | null;
  batch_id?: string | null;
  verification_status: string;
  blockchain_status: string;
  blockchain_tx_hash?: string | null;
  blockchain_network?: string | null;
  blockchain_anchor?: string | null;
  created_at: string;
  verified_at?: string | null;
}

export interface IntegrityBatch {
  batch_id: string;
  root_hash: string;
  event_count: number;
  status: string;
  blockchain_status: string;
  blockchain_tx_hash?: string | null;
  blockchain_network?: string | null;
  created_at: string;
  anchored_at?: string | null;
}

export interface ChainVerificationResult {
  is_valid: boolean;
  evaluated_records: number;
  error?: string | null;
  broken_index?: number | null;
}

export interface EventBlockchainInfo {
  event_id: string;
  blockchain_anchored: boolean;
  blockchain_status: string;
  blockchain_network?: string | null;
  blockchain_tx_hash?: string | null;
  batch_id?: string | null;
  root_hash?: string | null;
  merkle_proof?: Array<{ sibling: string; position: string }> | null;
  anchored_at?: string | null;
  contract_address?: string | null;
}

export interface LogIngestRequest {
  raw_log: string;
  source_id?: string | null;
  source_hint?: string | null;
}

export interface LogIngestResponse {
  status: string;
  event_id: string;
  topic?: string | null;
  partition?: number | null;
  mode: string;
  ingested_at: string;
}

export interface BatchLogIngestItem {
  raw_log: string;
  source_id?: string | null;
  source_hint?: string | null;
}

export interface BatchLogIngestRequest {
  logs: (string | BatchLogIngestItem)[];
  source_id?: string | null;
  source_hint?: string | null;
}

export interface BatchLogIngestResponse {
  status: string;
  total_received: number;
  total_accepted: number;
  total_failed: number;
  mode: string;
  event_ids: string[];
  errors: Array<{ index: number; error: any }>;
}

export interface StreamingTopicInfo {
  name: string;
  partitions: number;
  status: string;
}

export interface StreamingHealthResponse {
  status: "CONNECTED" | "DISCONNECTED" | "DISABLED" | "UNAVAILABLE";
  enabled: boolean;
  bootstrap_servers: string;
  cluster_id?: string | null;
  brokers_count: number;
  topics: StreamingTopicInfo[];
  consumer_group: string;
  message: string;
}

// ==========================================
// Authentication, RBAC, and Audit Logging
// ==========================================

export type SystemRole = "ADMIN" | "ANALYST" | "OPERATOR" | "VIEWER";

export interface Permission {
  id: string;
  name: string;
  description?: string | null;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at?: string | null;
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserCreateRequest {
  email: string;
  username: string;
  password: string;
  full_name: string;
  roles: string[];
}

export interface UserUpdateRequest {
  email?: string;
  full_name?: string;
  is_active?: boolean;
  password?: string;
  roles?: string[];
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  user_id?: string | null;
  username?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  status: "SUCCESS" | "FAILURE";
  details?: Record<string, unknown> | null;
}

export interface AuditListResponse {
  total: number;
  limit: number;
  offset: number;
  page: number;
  events: AuditLogItem[];
}

export interface AuditQueryParams {
  limit?: number;
  offset?: number;
  action?: string;
  user_id?: string;
  username?: string;
  resource_type?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
}




