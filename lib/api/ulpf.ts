import {
  AnalyticsDistributions,
  AnalyticsOverview,
  AnalyticsSummary,
  BatchLogProcessRequest,
  BatchProcessResponse,
  HealthResponse,
  LogListResponse,
  LogProcessRequest,
  LogQueryParams,
  ProcessingResult,
  StoredEventDetail,
  TrendPoint,
  AnomalyDetail,
  AnomalyListResponse,
  AnomalySummaryResponse,
  ModelStatusResponse,
  ModelTrainingRequest,
  ModelTrainingResponse,
  ChainVerificationResult,
  EventBlockchainInfo,
  EventVerificationResult,
  IntegrityBatch,
  IntegritySummary,
  OpenSearchHealth,
  ReindexResponse,
  LogIngestRequest,
  LogIngestResponse,
  BatchLogIngestRequest,
  BatchLogIngestResponse,
  StreamingHealthResponse,
  LoginRequest,
  LoginResponse,
  User,
  Role,
  UserCreateRequest,
  UserUpdateRequest,
  AuditListResponse,
  AuditQueryParams,
  SystemPerformanceMetrics,
} from "./types";




export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_ULPF_API_URL || "http://127.0.0.1:8000";
};

export const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("logforge_access_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
};

export class UlpfApiError extends Error {
  public code: string;
  public details?: unknown;

  constructor(message: string, code: string = "PROCESSING_ERROR", details?: unknown) {
    super(message);
    this.name = "UlpfApiError";
    this.code = code;
    this.details = details;
  }
}

/**
 * LogForge Universal Log Pre-processing Framework (ULPF) Typed API Client
 */
export const ulpfApi = {
  /**
   * Check backend engine health and registered parsers
   */
  async checkHealth(): Promise<HealthResponse> {
    const url = `${getApiBaseUrl()}/health`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new UlpfApiError(
          `Health check failed with HTTP ${res.status}`,
          "HEALTH_CHECK_FAILED"
        );
      }

      return (await res.json()) as HealthResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to connect to LogForge Processing Engine. Please verify that the backend is running at http://127.0.0.1:8000",
        "BACKEND_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Ingest and process a single raw log string into Universal Event Schema (UES)
   */
  async processLog(request: LogProcessRequest): Promise<ProcessingResult> {
    if (!request.raw_log || !request.raw_log.trim()) {
      throw new UlpfApiError(
        "Raw log payload cannot be empty.",
        "EMPTY_INPUT"
      );
    }

    const url = `${getApiBaseUrl()}/api/v1/logs/process`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          raw_log: request.raw_log,
          source_hint: request.source_hint || undefined,
        }),
      });

      const data = await res.json();

      // Successful 200 OK
      if (res.ok && data.status === "success") {
        return data as ProcessingResult;
      }

      // Handle RBAC Permission & Auth Denials
      if (res.status === 403) {
        const errorMsg = data.detail?.message || data.detail || "Access denied: Your account lacks the 'logs:ingest' permission.";
        throw new UlpfApiError(errorMsg, "PERMISSION_DENIED", data);
      }
      if (res.status === 401) {
        const errorMsg = data.detail?.message || data.detail || "Authentication required. Please log in.";
        throw new UlpfApiError(errorMsg, "UNAUTHORIZED", data);
      }

      // Handle structured 422 Unprocessable Content
      if (res.status === 422) {
        // Check if FastAPI wrapped in detail
        const errorObj = data.detail?.error || data.error;
        const code = errorObj?.code || "INVALID_LOG_FORMAT";
        const message =
          errorObj?.message ||
          "Unable to detect supported log format. Expected JSON, ArcSight CEF, or Syslog.";

        throw new UlpfApiError(message, code, errorObj?.details);
      }

      // Fallback HTTP status errors
      const fallbackMsg =
        data.detail?.message ||
        data.error?.message ||
        `Processing failed with server status ${res.status}`;
      throw new UlpfApiError(fallbackMsg, `HTTP_${res.status}`, data);
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;

      // Handle network errors (connection refused, offline, DNS failure)
      throw new UlpfApiError(
        "Unable to connect to LogForge Processing Engine. Please verify the FastAPI backend is running at http://127.0.0.1:8000.",
        "BACKEND_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Ingest and process a batch of raw logs
   */
  async processBatch(request: BatchLogProcessRequest): Promise<BatchProcessResponse> {
    const url = `${getApiBaseUrl()}/api/v1/logs/batch`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(request),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 403) {
          const errorMsg = data?.detail?.message || data?.detail || "Access denied: Your account lacks the 'logs:ingest' permission.";
          throw new UlpfApiError(errorMsg, "PERMISSION_DENIED", data);
        }
        if (res.status === 401) {
          const errorMsg = data?.detail?.message || data?.detail || "Authentication required. Please log in.";
          throw new UlpfApiError(errorMsg, "UNAUTHORIZED", data);
        }
        throw new UlpfApiError(
          data?.detail?.message || data?.detail || `Batch processing failed with HTTP ${res.status}`,
          `HTTP_${res.status}`,
          data
        );
      }

      return data as BatchProcessResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to connect to LogForge Processing Engine for batch ingestion.",
        "BACKEND_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Query persisted log events with pagination, full-text search, and filters.
   * Utilizes high-performance OpenSearch backend with automatic server-side MySQL fallback.
   */
  async getLogs(params: LogQueryParams = {}): Promise<LogListResponse> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set("limit", params.limit.toString());
    if (params.offset !== undefined) searchParams.set("offset", params.offset.toString());
    searchParams.set("engine", params.engine || "mysql");
    if (params.q) searchParams.set("q", params.q);
    if (params.event_id) searchParams.set("event_id", params.event_id);
    if (params.detected_format) searchParams.set("detected_format", params.detected_format);
    if (params.severity) searchParams.set("severity", params.severity);
    if (params.action) searchParams.set("action", params.action);
    if (params.source_ip) searchParams.set("source_ip", params.source_ip);
    if (params.destination_ip) searchParams.set("destination_ip", params.destination_ip);
    if (params.protocol) searchParams.set("protocol", params.protocol);
    if (params.start_time) searchParams.set("from", params.start_time);
    if (params.end_time) searchParams.set("to", params.end_time);
    if (params.search_after) searchParams.set("search_after", params.search_after);

    const queryStr = searchParams.toString();
    const primaryUrl = `${getApiBaseUrl()}/api/v1/search/events${queryStr ? `?${queryStr}` : ""}`;
    const fallbackUrl = `${getApiBaseUrl()}/api/v1/logs${queryStr ? `?${queryStr}` : ""}`;

    try {
      let res = await fetch(primaryUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      // If search endpoint is not found (e.g. proxy mismatch), fall back to legacy logs endpoint
      if (res.status === 404) {
        res = await fetch(fallbackUrl, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
      }

      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Failed to fetch logs: HTTP ${res.status}`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }

      return data as LogListResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch logs from LogForge search and persistence store.",
        "DATABASE_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Fetch complete stored event details by event_id UUID
   */
  async getLogById(eventId: string): Promise<StoredEventDetail> {
    const url = `${getApiBaseUrl()}/api/v1/logs/${encodeURIComponent(eventId)}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Event not found (HTTP ${res.status})`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }

      return data as StoredEventDetail;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        `Failed to retrieve details for event '${eventId}'.`,
        "FETCH_FAILED",
        err
      );
    }
  },

  /**
   * Fetch consolidated dashboard analytics overview (summary + distributions + trends)
   */
  async getAnalyticsOverview(timeRange: string = "24h"): Promise<AnalyticsOverview> {
    const url = `${getApiBaseUrl()}/api/v1/analytics/overview?time_range=${encodeURIComponent(timeRange)}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Failed to fetch analytics overview (HTTP ${res.status})`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }

      return data as AnalyticsOverview;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch operational analytics from LogForge backend.",
        "ANALYTICS_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Fetch top-level dashboard KPI summary
   */
  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const url = `${getApiBaseUrl()}/api/v1/analytics/summary`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Failed to fetch analytics summary (HTTP ${res.status})`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }

      return data as AnalyticsSummary;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch KPI summary from LogForge backend.",
        "ANALYTICS_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Fetch categorical format, severity, action, and endpoint distributions
   */
  async getAnalyticsDistributions(): Promise<AnalyticsDistributions> {
    const url = `${getApiBaseUrl()}/api/v1/analytics/distributions`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Failed to fetch distributions (HTTP ${res.status})`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }

      return data as AnalyticsDistributions;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch distributions from LogForge backend.",
        "ANALYTICS_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Fetch time-series event trends
   */
  async getAnalyticsTrends(timeRange: string = "24h"): Promise<TrendPoint[]> {
    const url = `${getApiBaseUrl()}/api/v1/analytics/trends?time_range=${encodeURIComponent(timeRange)}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Failed to fetch event trends (HTTP ${res.status})`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }

      return data as TrendPoint[];
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch event trends from LogForge backend.",
        "ANALYTICS_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Get Isolation Forest ML engine operational status
   */
  async getModelStatus(): Promise<ModelStatusResponse> {
    const url = `${getApiBaseUrl()}/api/v1/ml/status`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || `Failed to fetch ML model status (HTTP ${res.status})`,
          "ML_STATUS_ERROR"
        );
      }
      return data as ModelStatusResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch ML model status from LogForge backend.",
        "ML_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Trigger on-demand training / calibration of Isolation Forest model
   */
  async trainModel(params?: ModelTrainingRequest): Promise<ModelTrainingResponse> {
    const url = `${getApiBaseUrl()}/api/v1/ml/train`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(params || {}),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data.detail === "string" ? data.detail : data.detail?.message || "Model training failed";
        throw new UlpfApiError(msg, `HTTP_${res.status}`, data.detail);
      }
      return data as ModelTrainingResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Failed to trigger ML model training.",
        "ML_TRAINING_ERROR",
        err
      );
    }
  },

  /**
   * Get paginated list of anomalies with joined event context
   */
  async getAnomalies(params?: {
    page?: number;
    pageSize?: number;
    classification?: string;
    minScore?: number;
  }): Promise<AnomalyListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.append("page", params.page.toString());
    if (params?.pageSize) query.append("page_size", params.pageSize.toString());
    if (params?.classification) query.append("classification", params.classification);
    if (params?.minScore !== undefined) query.append("min_score", params.minScore.toString());

    const url = `${getApiBaseUrl()}/api/v1/ml/anomalies?${query.toString()}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || `Failed to fetch anomalies (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as AnomalyListResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch anomalies from LogForge backend.",
        "ML_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Get anomaly KPI summary and top anomalous sources for dashboard
   */
  async getAnomalySummary(): Promise<AnomalySummaryResponse> {
    const url = `${getApiBaseUrl()}/api/v1/ml/anomalies/summary`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || `Failed to fetch anomaly summary (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as AnomalySummaryResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch anomaly summary from LogForge backend.",
        "ML_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Get anomaly scoring and explainability for a single event ID
   */
  async getAnomalyDetail(eventId: string): Promise<AnomalyDetail> {
    const url = `${getApiBaseUrl()}/api/v1/ml/anomalies/${encodeURIComponent(eventId)}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail || `Failed to fetch anomaly detail (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as AnomalyDetail;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        `Unable to fetch anomaly detail for event ${eventId}.`,
        "ML_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Fetch aggregate data integrity and blockchain anchoring summary
   */
  async getIntegritySummary(): Promise<IntegritySummary> {
    const url = `${getApiBaseUrl()}/api/v1/integrity/summary`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || `Failed to fetch integrity summary (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as IntegritySummary;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch integrity summary from LogForge backend.",
        "INTEGRITY_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Cryptographically verify an event by recalculating SHA-256 over raw bytes server-side
   */
  async verifyEventIntegrity(eventId: string): Promise<EventVerificationResult> {
    const url = `${getApiBaseUrl()}/api/v1/integrity/${encodeURIComponent(eventId)}/verify`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || `Verification failed (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as EventVerificationResult;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        `Unable to verify integrity for event ${eventId}.`,
        "VERIFICATION_FAILED",
        err
      );
    }
  },

  /**
   * Retrieve blockchain anchoring proof and Merkle audit path for an event
   */
  async getEventBlockchain(eventId: string): Promise<EventBlockchainInfo> {
    const url = `${getApiBaseUrl()}/api/v1/integrity/${encodeURIComponent(eventId)}/blockchain`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail || `Failed to fetch blockchain info (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as EventBlockchainInfo;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        `Unable to fetch blockchain proof for event ${eventId}.`,
        "BLOCKCHAIN_UNAVAILABLE",
        err
      );
    }
  },

  /**
   * Create a new Merkle batch from unbatched integrity records
   */
  async createIntegrityBatch(maxEvents: number = 50): Promise<IntegrityBatch> {
    const url = `${getApiBaseUrl()}/api/v1/integrity/batches/create`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ max_events: maxEvents }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || `Failed to create batch (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as IntegrityBatch;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Unable to create integrity batch.", "BATCH_CREATION_FAILED", err);
    }
  },

  /**
   * Anchor a Merkle batch root to the blockchain
   */
  async anchorIntegrityBatch(batchId: string): Promise<IntegrityBatch> {
    const url = `${getApiBaseUrl()}/api/v1/integrity/batches/anchor`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ batch_id: batchId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || `Failed to anchor batch (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as IntegrityBatch;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Unable to anchor batch to blockchain.", "ANCHORING_FAILED", err);
    }
  },

  /**
   * List chronological integrity batches
   */
  async listIntegrityBatches(limit: number = 20, offset: number = 0): Promise<IntegrityBatch[]> {
    const url = `${getApiBaseUrl()}/api/v1/integrity/batches?limit=${limit}&offset=${offset}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail || `Failed to list batches (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as IntegrityBatch[];
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Unable to list integrity batches.", "BATCH_LIST_FAILED", err);
    }
  },

  /**
   * Verify the sequential cryptographic hash chain
   */
  async verifyHashChain(limit: number = 500): Promise<ChainVerificationResult> {
    const url = `${getApiBaseUrl()}/api/v1/integrity/chain/verify?limit=${limit}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail || `Chain verification failed (HTTP ${res.status})`,
          `HTTP_${res.status}`
        );
      }
      return data as ChainVerificationResult;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Unable to verify hash chain.", "CHAIN_VERIFICATION_FAILED", err);
    }
  },

  /**
   * Query OpenSearch cluster and index health status
   */
  async getSearchHealth(): Promise<OpenSearchHealth> {
    const url = `${getApiBaseUrl()}/api/v1/search/health`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        return {
          status: "DISCONNECTED",
          enabled: false,
          message: `OpenSearch health check returned HTTP ${res.status}`,
        };
      }
      return (await res.json()) as OpenSearchHealth;
    } catch {
      return {
        status: "DISCONNECTED",
        enabled: false,
        message: "Backend search service unreachable",
      };
    }
  },

  /**
   * Trigger administrative reindex from MySQL into OpenSearch
   */
  async reindexSearch(batchSize: number = 500): Promise<ReindexResponse> {
    const url = `${getApiBaseUrl()}/api/v1/search/reindex`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ batch_size: batchSize }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Reindex failed with HTTP ${res.status}`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }
      return data as ReindexResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Unable to trigger OpenSearch reindex.", "REINDEX_FAILED", err);
    }
  },

  /**
   * Asynchronously ingest a single raw log event into the Kafka stream
   */
  async ingestLog(payload: LogIngestRequest): Promise<LogIngestResponse> {
    const url = `${getApiBaseUrl()}/api/v1/logs/ingest`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Ingestion failed with status ${res.status}`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }
      return data as LogIngestResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Log ingestion service is currently unreachable.", "INGEST_FAILED", err);
    }
  },

  /**
   * Asynchronously ingest a batch of raw logs into the Kafka stream
   */
  async ingestBatch(payload: BatchLogIngestRequest): Promise<BatchLogIngestResponse> {
    const url = `${getApiBaseUrl()}/api/v1/logs/ingest-batch`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorObj = data.detail?.error || data.error;
        throw new UlpfApiError(
          errorObj?.message || `Batch ingestion failed with status ${res.status}`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }
      return data as BatchLogIngestResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Batch ingestion service is currently unreachable.", "BATCH_INGEST_FAILED", err);
    }
  },

  /**
   * Fetch Kafka streaming cluster health and partition telemetry
   */
  async getStreamingHealth(): Promise<StreamingHealthResponse> {
    const url = `${getApiBaseUrl()}/api/v1/streaming/health`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        return {
          status: "DISCONNECTED",
          enabled: false,
          bootstrap_servers: "",
          brokers_count: 0,
          topics: [],
          consumer_group: "logforge-ulpf-workers",
          message: `Streaming health check returned HTTP ${res.status}`,
        };
      }
      return (await res.json()) as StreamingHealthResponse;
    } catch {
      return {
        status: "DISCONNECTED",
        enabled: false,
        bootstrap_servers: "",
        brokers_count: 0,
        topics: [],
        consumer_group: "logforge-ulpf-workers",
        message: "Unable to reach streaming health endpoint",
      };
    }
  },

  // ==========================================
  // Authentication & RBAC APIs
  // ==========================================

  /**
   * Authenticate user with username/password, receiving JWT token and user profile
   */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const url = `${getApiBaseUrl()}/api/v1/auth/login`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Authentication failed",
          data.detail?.code || `HTTP_${res.status}`
        );
      }
      if (typeof window !== "undefined" && data.access_token) {
        localStorage.setItem("logforge_access_token", data.access_token);
        localStorage.setItem("logforge_user", JSON.stringify(data.user));
      }
      return data as LoginResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Authentication service unreachable.", "LOGIN_FAILED", err);
    }
  },

  /**
   * Terminate user session and clear security tokens
   */
  async logout(): Promise<{ status: string; message: string }> {
    const url = `${getApiBaseUrl()}/api/v1/auth/logout`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (typeof window !== "undefined") {
        localStorage.removeItem("logforge_access_token");
        localStorage.removeItem("logforge_user");
      }
      if (!res.ok) {
        return { status: "success", message: "Logged out locally" };
      }
      return await res.json();
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("logforge_access_token");
        localStorage.removeItem("logforge_user");
      }
      return { status: "success", message: "Logged out locally" };
    }
  },

  /**
   * Fetch currently authenticated user profile with roles and permissions
   */
  async getCurrentUser(timeoutMs: number = 3500): Promise<User> {
    const url = `${getApiBaseUrl()}/api/v1/auth/me`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
        signal: controller?.signal,
      });
      if (timer) clearTimeout(timer);
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Session expired or invalid",
          `HTTP_${res.status}`
        );
      }
      if (typeof window !== "undefined") {
        localStorage.setItem("logforge_user", JSON.stringify(data));
      }
      return data as User;
    } catch (err: unknown) {
      if (timer) clearTimeout(timer);
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Unable to verify user session.", "AUTH_CHECK_FAILED", err);
    }
  },

  /**
   * List all registered user accounts (Admin/RBAC protected)
   */
  async listUsers(params?: { limit?: number; offset?: number }): Promise<User[]> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.offset) query.set("offset", params.offset.toString());
    const url = `${getApiBaseUrl()}/api/v1/users?${query.toString()}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Failed to fetch users",
          `HTTP_${res.status}`
        );
      }
      return data as User[];
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("User management service unreachable.", "USERS_FETCH_FAILED", err);
    }
  },

  /**
   * Create a new user account with assigned roles
   */
  async createUser(payload: UserCreateRequest): Promise<User> {
    const url = `${getApiBaseUrl()}/api/v1/users`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Failed to create user",
          `HTTP_${res.status}`
        );
      }
      return data as User;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("User creation service failed.", "USER_CREATE_FAILED", err);
    }
  },

  /**
   * Update existing user attributes or role assignments
   */
  async updateUser(userId: string, payload: UserUpdateRequest): Promise<User> {
    const url = `${getApiBaseUrl()}/api/v1/users/${encodeURIComponent(userId)}`;
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Failed to update user",
          `HTTP_${res.status}`
        );
      }
      return data as User;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("User update service failed.", "USER_UPDATE_FAILED", err);
    }
  },

  /**
   * List all predefined RBAC roles and granted permissions
   */
  async listRoles(): Promise<Role[]> {
    const url = `${getApiBaseUrl()}/api/v1/users/roles/all`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Failed to fetch roles",
          `HTTP_${res.status}`
        );
      }
      return data as Role[];
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Role lookup failed.", "ROLES_FETCH_FAILED", err);
    }
  },

  /**
   * Query immutable security audit log trail
   */
  async getAuditLogs(params?: AuditQueryParams): Promise<AuditListResponse> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.offset) query.set("offset", params.offset.toString());
    if (params?.action) query.set("action", params.action);
    if (params?.user_id) query.set("user_id", params.user_id);
    if (params?.username) query.set("username", params.username);
    if (params?.resource_type) query.set("resource_type", params.resource_type);
    if (params?.status) query.set("status", params.status);
    if (params?.start_time) query.set("start_time", params.start_time);
    if (params?.end_time) query.set("end_time", params.end_time);

    const url = `${getApiBaseUrl()}/api/v1/audit?${query.toString()}`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Failed to fetch audit logs",
          `HTTP_${res.status}`
        );
      }
      return data as AuditListResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Audit log service unreachable.", "AUDIT_FETCH_FAILED", err);
    }
  },

  /**
   * Fetch real-time system performance and throughput telemetry
   */
  async getPerformanceMetrics(): Promise<SystemPerformanceMetrics> {
    const url = `${getApiBaseUrl()}/api/v1/system/performance`;
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Failed to fetch performance telemetry",
          `HTTP_${res.status}`
        );
      }
      return data as SystemPerformanceMetrics;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Performance telemetry service unreachable.", "PERFORMANCE_FETCH_FAILED", err);
    }
  },

  /**
   * Reset performance metrics telemetry counters for benchmark testing
   */
  async resetPerformanceMetrics(): Promise<{ status: string; message: string }> {
    const url = `${getApiBaseUrl()}/api/v1/system/performance/reset`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new UlpfApiError(
          data.detail?.message || data.detail || "Failed to reset performance telemetry",
          `HTTP_${res.status}`
        );
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError("Performance reset service unreachable.", "PERFORMANCE_RESET_FAILED", err);
    }
  },
};



