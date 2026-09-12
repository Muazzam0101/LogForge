"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AlertCircle, Terminal } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";
import { ulpfApi, UlpfApiError } from "@/lib/api/ulpf";
import {
  StoredEventDetail,
  StoredEventSummary,
  LogFilterState,
  LogQueryParams,
} from "@/lib/api/types";
import { LogToolbar } from "@/components/explorer/LogToolbar";
import { LogFilters } from "@/components/explorer/LogFilters";
import { LogTable } from "@/components/explorer/LogTable";
import { Pagination } from "@/components/explorer/Pagination";
import { EmptyState } from "@/components/explorer/EmptyState";
import { EventDetailModal } from "@/components/explorer/EventDetailModal";

const PAGE_SIZE = 15;

function ExplorerContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { openUploadModal } = useModals();

  // Initialize filter state from URL search params (Requirement 12)
  const [filters, setFilters] = useState<LogFilterState>(() => ({
    q: searchParams.get("q") || "",
    detected_format: searchParams.get("format") || searchParams.get("detected_format") || "",
    severity: searchParams.get("severity") || "",
    action: searchParams.get("action") || "",
    protocol: searchParams.get("protocol") || "",
    source_ip: searchParams.get("source_ip") || "",
    destination_ip: searchParams.get("destination_ip") || "",
    start_time: searchParams.get("start_time") || "",
    end_time: searchParams.get("end_time") || "",
  }));

  const [searchQuery, setSearchQuery] = useState(filters.q);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Pagination state (0-indexed)
  const initialPage = parseInt(searchParams.get("page") || "1", 10) - 1;
  const [page, setPage] = useState(initialPage >= 0 ? initialPage : 0);

  // Data state
  const [events, setEvents] = useState<StoredEventSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Event Details Modal state
  const [activeEventDetail, setActiveEventDetail] = useState<StoredEventDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Synchronize state with URL query parameters
  const updateUrlParams = useCallback(
    (currentFilters: LogFilterState, currentPage: number) => {
      const params = new URLSearchParams();
      if (currentFilters.q) params.set("q", currentFilters.q);
      if (currentFilters.detected_format) params.set("format", currentFilters.detected_format);
      if (currentFilters.severity) params.set("severity", currentFilters.severity);
      if (currentFilters.action) params.set("action", currentFilters.action);
      if (currentFilters.protocol) params.set("protocol", currentFilters.protocol);
      if (currentFilters.source_ip) params.set("source_ip", currentFilters.source_ip);
      if (currentFilters.destination_ip) params.set("destination_ip", currentFilters.destination_ip);
      if (currentFilters.start_time) params.set("start_time", currentFilters.start_time);
      if (currentFilters.end_time) params.set("end_time", currentFilters.end_time);
      if (currentPage > 0) params.set("page", (currentPage + 1).toString());

      const queryStr = params.toString();
      const newUrl = queryStr ? `${pathname}?${queryStr}` : pathname;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname]
  );

  // Fetch real database records from backend GET /api/v1/logs
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const queryParams: LogQueryParams = {
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      };

      if (filters.q.trim()) queryParams.q = filters.q.trim();
      if (filters.detected_format) queryParams.detected_format = filters.detected_format;
      if (filters.severity) queryParams.severity = filters.severity;
      if (filters.action) queryParams.action = filters.action;
      if (filters.protocol) queryParams.protocol = filters.protocol;
      if (filters.source_ip.trim()) queryParams.source_ip = filters.source_ip.trim();
      if (filters.destination_ip.trim()) queryParams.destination_ip = filters.destination_ip.trim();
      if (filters.start_time) queryParams.start_time = new Date(filters.start_time).toISOString();
      if (filters.end_time) queryParams.end_time = new Date(filters.end_time).toISOString();

      const res = await ulpfApi.getLogs(queryParams);
      setEvents(res.events);
      setTotalCount(res.total);
      updateUrlParams(filters, page);
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        setError(`[${err.code}] ${err.message}`);
      } else {
        setError("Unable to connect to the persistent database. Verify that the FastAPI backend is running at http://127.0.0.1:8000.");
      }
      setEvents([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, updateUrlParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, q: searchQuery }));
    setPage(0);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setFilters((prev) => ({ ...prev, q: "" }));
    setPage(0);
  };

  // Filter handlers
  const handleFilterChange = <K extends keyof LogFilterState>(key: K, value: LogFilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setPage(0);
    fetchLogs();
  };

  const handleClearFilters = () => {
    const reset: LogFilterState = {
      q: "",
      detected_format: "",
      severity: "",
      action: "",
      protocol: "",
      source_ip: "",
      destination_ip: "",
      start_time: "",
      end_time: "",
    };
    setSearchQuery("");
    setFilters(reset);
    setPage(0);
    updateUrlParams(reset, 0);
  };

  // Inspect Event Details modal
  const handleInspectEvent = async (eventId: string) => {
    setIsLoadingDetail(true);
    try {
      const detail = await ulpfApi.getLogById(eventId);
      setActiveEventDetail(detail);
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        alert(`Failed to load event details: ${err.message}`);
      }
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Calculate active filter count (excluding pagination)
  const activeFilterCount = [
    filters.detected_format,
    filters.severity,
    filters.action,
    filters.protocol,
    filters.source_ip,
    filters.destination_ip,
    filters.start_time,
    filters.end_time,
  ].filter(Boolean).length;

  const isFiltered = activeFilterCount > 0 || !!filters.q;

  return (
    <div className="space-y-5">
      {/* 1. Log Toolbar */}
      <ScrollReveal direction="up" delay={40} duration={500}>
        <LogToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          onClearSearch={handleClearSearch}
          isFiltersOpen={isFiltersOpen}
          onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
          activeFilterCount={activeFilterCount}
          totalCount={totalCount}
          isLoading={isLoading}
          onRefresh={fetchLogs}
          onOpenUpload={openUploadModal}
        />
      </ScrollReveal>

      {/* 2. Log Filters Panel & Summary */}
      <ScrollReveal direction="up" delay={80} duration={500}>
        <LogFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
          isOpen={isFiltersOpen}
          totalFilteredCount={totalCount}
        />
      </ScrollReveal>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Database Error: </span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchLogs}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Main Results Table or Empty State Card */}
      <ScrollReveal direction="up" delay={120} duration={550}>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
          {events.length === 0 && !isLoading ? (
            <EmptyState
              isFiltered={isFiltered}
              onClearFilters={handleClearFilters}
              onOpenUpload={openUploadModal}
            />
          ) : (
            <>
              <LogTable
                events={events}
                isLoading={isLoading}
                onInspectEvent={handleInspectEvent}
              />
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                totalCount={totalCount}
                isLoading={isLoading}
                onPageChange={(newPage) => {
                  setPage(newPage);
                }}
              />
            </>
          )}
        </div>
      </ScrollReveal>

      {/* 4. Event Details Inspection Modal */}
      <EventDetailModal
        event={activeEventDetail}
        onClose={() => setActiveEventDetail(null)}
      />
    </div>
  );
}

export default function ExplorerPage() {
  return (
    <Suspense
      fallback={
        <div className="p-16 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading Logs Explorer...</p>
        </div>
      }
    >
      <ExplorerContent />
    </Suspense>
  );
}
