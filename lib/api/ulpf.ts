import {
  ApiClientError,
  BatchLogProcessRequest,
  BatchProcessResponse,
  HealthResponse,
  LogListResponse,
  LogProcessRequest,
  LogQueryParams,
  ProcessingResult,
  StoredEventDetail,
} from "./types";

const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_ULPF_API_URL || "http://127.0.0.1:8000";
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
          "Content-Type": "application/json",
          Accept: "application/json",
        },
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
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!res.ok) {
        throw new UlpfApiError(
          `Batch processing failed with HTTP ${res.status}`,
          `HTTP_${res.status}`
        );
      }

      return (await res.json()) as BatchProcessResponse;
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
   * Query persisted log events with pagination and filters
   */
  async getLogs(params: LogQueryParams = {}): Promise<LogListResponse> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set("limit", params.limit.toString());
    if (params.offset !== undefined) searchParams.set("offset", params.offset.toString());
    if (params.q) searchParams.set("q", params.q);
    if (params.event_id) searchParams.set("event_id", params.event_id);
    if (params.detected_format) searchParams.set("detected_format", params.detected_format);
    if (params.severity) searchParams.set("severity", params.severity);
    if (params.action) searchParams.set("action", params.action);
    if (params.source_ip) searchParams.set("source_ip", params.source_ip);
    if (params.destination_ip) searchParams.set("destination_ip", params.destination_ip);
    if (params.protocol) searchParams.set("protocol", params.protocol);
    if (params.start_time) searchParams.set("start_time", params.start_time);
    if (params.end_time) searchParams.set("end_time", params.end_time);

    const queryStr = searchParams.toString();
    const url = `${getApiBaseUrl()}/api/v1/logs${queryStr ? `?${queryStr}` : ""}`;

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
          errorObj?.message || `Failed to fetch logs: HTTP ${res.status}`,
          errorObj?.code || `HTTP_${res.status}`,
          errorObj?.details
        );
      }

      return data as LogListResponse;
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) throw err;
      throw new UlpfApiError(
        "Unable to fetch logs from LogForge persistence store.",
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
};
