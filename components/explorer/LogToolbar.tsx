"use client";

import {
  Search,
  Filter,
  RefreshCw,
  Database,
  X,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

interface LogToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearSearch: () => void;
  isFiltersOpen: boolean;
  onToggleFilters: () => void;
  activeFilterCount: number;
  totalCount: number;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenUpload: () => void;
  searchEngine?: string;
  selectedEngine: "mysql" | "opensearch";
  onSelectEngine: (engine: "mysql" | "opensearch") => void;
}

export function LogToolbar({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onClearSearch,
  isFiltersOpen,
  onToggleFilters,
  activeFilterCount,
  totalCount,
  isLoading,
  onRefresh,
  onOpenUpload,
  searchEngine = "mysql",
  selectedEngine = "mysql",
  onSelectEngine,
}: LogToolbarProps) {
  const isUsingOpenSearch = searchEngine === "opensearch";
  const isFallback = searchEngine === "mysql_fallback";

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-[#15171D] rounded-2xl p-5 sm:p-6 border border-slate-100 dark:border-[#20232B] shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {selectedEngine === "opensearch" ? (
              isUsingOpenSearch ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/50 text-cyan-700 dark:text-cyan-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
                  <span>OpenSearch Scalability Engine (Active)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>OpenSearch Offline · MySQL Fallback Active</span>
                </div>
              )
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/70 dark:border-orange-800/50 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                <Database className="w-3.5 h-3.5 text-orange-500" />
                <span>MySQL Persistence · Primary Store (Default)</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Logs Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search, filter, and audit persisted security events across heterogeneous sources with SHA-256 cryptographic integrity
          </p>
        </div>

        {/* Engine Switcher & Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Storage & Query Engine Selector */}
          <div className="bg-slate-100 dark:bg-[#1C1F26] p-1 rounded-xl border border-slate-200 dark:border-[#292C35] flex items-center gap-1 shadow-inner">
            <button
              type="button"
              onClick={() => onSelectEngine("mysql")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedEngine === "mysql"
                  ? "bg-white dark:bg-[#252830] text-orange-700 dark:text-orange-400 shadow-sm border border-slate-200/60 dark:border-transparent font-bold"
                  : "text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-[#F5F5F7]"
              }`}
              title="Query directly from primary MySQL persistence store (Instant & Authoritative)"
            >
              <Database className="w-3.5 h-3.5 text-orange-500" />
              <span>MySQL (Default)</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectEngine("opensearch")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedEngine === "opensearch"
                  ? "bg-white dark:bg-[#252830] text-cyan-700 dark:text-cyan-400 shadow-sm border border-slate-200/60 dark:border-transparent font-bold"
                  : "text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-[#F5F5F7]"
              }`}
              title="Query via distributed OpenSearch index (Full-text & Deep Pagination)"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
              <span>OpenSearch</span>
            </button>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium text-slate-600 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Total Events:</span>
            <span className="font-bold text-slate-900">
              {isLoading && totalCount === 0 ? "--" : totalCount.toLocaleString()}
            </span>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-[#292C35] hover:bg-slate-50 dark:hover:bg-[#1D2027] text-slate-600 dark:text-[#A5A7B0] dark:hover:text-[#F5F5F7] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-[#8B5CF6] dark:hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Upload Logs</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Filter Toggle Bar */}
      <div className="bg-white dark:bg-[#17191F] rounded-2xl p-4 sm:p-5 border border-slate-100 dark:border-[#292C35] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#A5A7B0]">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search across Event ID, IP, protocol, action, format, raw payload..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50/90 dark:bg-[#17191F] hover:bg-slate-50 dark:hover:bg-[#1D2027] focus:bg-white dark:focus:bg-[#17191F] text-xs sm:text-sm font-mono text-slate-800 dark:text-[#F5F5F7] placeholder:text-slate-400 dark:placeholder:text-[#A5A7B0]/60 border border-slate-200 dark:border-[#292C35] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#8B5CF6]/30 focus:border-orange-400 dark:focus:border-[#8B5CF6] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:text-[#A5A7B0] dark:hover:text-[#F5F5F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 dark:bg-[#8B5CF6] dark:hover:bg-[#6D28D9] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={onToggleFilters}
            className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer ${
              isFiltersOpen || activeFilterCount > 0
                ? "bg-orange-50 dark:bg-[#1D2027] border-orange-200 dark:border-[#8B5CF6] text-orange-700 dark:text-[#8B5CF6]"
                : "border-slate-200 dark:border-[#292C35] hover:bg-slate-50 dark:hover:bg-[#1D2027] text-slate-700 dark:text-[#A5A7B0] dark:hover:text-[#F5F5F7]"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-orange-600 dark:bg-[#8B5CF6] text-white text-[11px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
