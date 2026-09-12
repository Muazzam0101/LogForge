"use client";

import React from "react";
import {
  Search,
  Filter,
  RefreshCw,
  Database,
  X,
  SlidersHorizontal,
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
}: LogToolbarProps) {
  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>MySQL Persistent Log Repository</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Logs Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search, filter, and audit persisted security events across heterogeneous sources with SHA-256 cryptographic integrity
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2.5">
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
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh logs from MySQL"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Upload Logs</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Filter Toggle Bar */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
        <form onSubmit={onSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search across Event ID, IP, protocol, action, format, raw payload..."
              className="w-full pl-10 pr-10 py-3 bg-slate-50/90 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm font-mono text-slate-800 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-xs transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Search className="w-4 h-4" />
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={onToggleFilters}
            className={`px-4 py-3 rounded-2xl border text-xs sm:text-sm font-semibold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer ${
              isFiltersOpen || activeFilterCount > 0
                ? "bg-purple-50 border-purple-200 text-purple-700"
                : "border-slate-200 hover:bg-slate-50 text-slate-700"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[11px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
