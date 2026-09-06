"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Terminal,
  Calendar,
  RefreshCw,
  Eye,
  Lock,
  ArrowRight,
  AlertCircle,
  Database,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";
import { ulpfApi, UlpfApiError } from "@/lib/api/ulpf";
import { StoredEventDetail, StoredEventSummary } from "@/lib/api/types";
import { EventDetailModal } from "@/components/explorer/EventDetailModal";

const PAGE_SIZE = 15;

export default function ExplorerPage() {
  const { openUploadModal } = useModals();

  // Query & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");

  // Pagination State
  const [page, setPage] = useState(0);

  // Data State
  const [events, setEvents] = useState<StoredEventSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State for inspecting single event
  const [activeEventDetail, setActiveEventDetail] = useState<StoredEventDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Fetch real database records from backend GET /api/v1/logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build filter parameters
      const params: Parameters<typeof ulpfApi.getLogs>[0] = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };

      if (selectedFormat) params.detected_format = selectedFormat;
      if (selectedSeverity) params.severity = selectedSeverity;
      if (selectedAction) params.action = selectedAction;

      // Smart search query: check if input is IP, UUID, or keyword
      const q = searchQuery.trim();
      if (q) {
        if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(q)) {
          params.source_ip = q;
        } else if (/^[0-9a-fA-F-]{36}$/.test(q)) {
          params.event_id = q;
        } else if (["json", "cef", "syslog"].includes(q.toLowerCase())) {
          params.detected_format = q.toLowerCase();
        } else if (["allow", "block", "deny", "drop"].includes(q.toLowerCase())) {
          params.action = q.toLowerCase();
        } else if (["critical", "high", "medium", "low", "informational"].includes(q.toLowerCase())) {
          params.severity = q.toLowerCase();
        } else {
          params.source_ip = q;
        }
      }

      const res = await ulpfApi.getLogs(params);
      setEvents(res.events);
      setTotalCount(res.total);
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        setError(`[${err.code}] ${err.message}`);
      } else {
        setError("Failed to connect to the persistent database. Verify FastAPI is running at http://127.0.0.1:8000");
      }
      setEvents([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedFormat, selectedSeverity, selectedAction, searchQuery]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // View full event details via GET /api/v1/logs/{event_id}
  const handleInspectEvent = async (eventId: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await ulpfApi.getLogById(eventId);
      setActiveEventDetail(detail);
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        alert(`Failed to load event: ${err.message}`);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const getSeverityBadge = (sev: string | null) => {
    const s = (sev || "unknown").toLowerCase();
    if (s.includes("crit") || s.includes("fatal")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (s.includes("high") || s.includes("err")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s.includes("med") || s.includes("warn")) {
      return "bg-amber-50/70 text-amber-600 border-amber-200/60";
    }
    if (s.includes("low")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>PostgreSQL Persistent Log Repository</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Logs Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Search and audit persisted security events across heterogeneous sources with SHA-256 hash integrity
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchLogs()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
              title="Refresh logs from PostgreSQL"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <span>Upload Logs</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Query & Filter Bar */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(0);
              fetchLogs();
            }}
            className="flex flex-col sm:flex-row items-stretch gap-2.5"
          >
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by IP (e.g. 10.0.0.15), UUID event_id, action, or severity..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50/90 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm font-mono text-slate-800 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all shadow-2xs"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Search className="w-4 h-4" />
              <span>Filter Events</span>
            </button>
          </form>

          {/* Filter Dropdowns & Quick Selectors */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Format:</span>
              </span>
              {["", "json", "cef", "syslog"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => {
                    setSelectedFormat(fmt);
                    setPage(0);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors border ${
                    selectedFormat === fmt
                      ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                      : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  {fmt === "" ? "ALL FORMATS" : fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Severity:</span>
              {["", "critical", "high", "medium", "low", "informational"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => {
                    setSelectedSeverity(sev);
                    setPage(0);
                  }}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-lg transition-colors border ${
                    selectedSeverity === sev
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold"
                      : "bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100"
                  }`}
                >
                  {sev === "" ? "ALL" : sev.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Database Error: </span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchLogs()}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Results Table or Empty State */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {/* Table Header Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Persisted Events Repository
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                ({totalCount} records total)
              </span>
            </div>

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 hidden sm:inline">
                  Page {page + 1} of {Math.max(1, totalPages)}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
                    disabled={page + 1 >= totalPages || isLoading}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono">
                Querying PostgreSQL persistent log store...
              </p>
            </div>
          ) : events.length === 0 ? (
            /* Proper Empty State: "No events processed yet." as required by prompt */
            <div className="p-16 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Terminal className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  No events processed yet.
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                  The persistent database currently has zero recorded events matching your query. Ingest raw log streams via the terminal or upload files to populate real audit records.
                </p>
              </div>
              <button
                onClick={openUploadModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <span>Upload Logs to Ingest</span>
              </button>
            </div>
          ) : (
            /* Live Records Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Source → Dest</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">SHA-256 Digest</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {events.map((evt) => (
                    <tr
                      key={evt.event_id}
                      className="hover:bg-purple-50/20 transition-colors group cursor-pointer"
                      onClick={() => handleInspectEvent(evt.event_id)}
                    >
                      {/* Event ID */}
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <span className="font-mono text-[11px] text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded-md border border-purple-100/60">
                          {evt.event_id.slice(0, 8)}...{evt.event_id.slice(-4)}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3.5 px-4 text-slate-500 font-sans text-xs">
                        {evt.timestamp
                          ? new Date(evt.timestamp).toLocaleString(undefined, {
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : "--"}
                      </td>

                      {/* Detected Format */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                          {evt.detected_format}
                        </span>
                      </td>

                      {/* Severity */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                            evt.severity
                          )}`}
                        >
                          {evt.severity || "UNCLASSIFIED"}
                        </span>
                      </td>

                      {/* Source -> Destination */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5 text-xs font-mono">
                          <span>{evt.source_ip || "--"}</span>
                          <ArrowRight className="w-3 h-3 text-slate-300" />
                          <span>{evt.destination_ip || "--"}</span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        {evt.action ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                            {evt.action}
                          </span>
                        ) : (
                          <span className="text-slate-300">--</span>
                        )}
                      </td>

                      {/* SHA-256 Digest */}
                      <td className="py-3.5 px-4 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Lock className="w-3 h-3 text-emerald-500" />
                          <span className="text-[11px] truncate max-w-[100px]" title={evt.sha256_hash}>
                            {evt.sha256_hash.slice(0, 10)}...
                          </span>
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleInspectEvent(evt.event_id);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-600 rounded-lg transition-colors border border-purple-200 hover:border-purple-600 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Event Details Inspection Modal */}
      <EventDetailModal
        event={activeEventDetail}
        onClose={() => setActiveEventDetail(null)}
      />
    </div>
  );
}
