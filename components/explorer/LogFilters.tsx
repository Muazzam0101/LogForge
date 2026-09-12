"use client";

import React from "react";
import { Filter, X, RotateCcw, Check, Calendar } from "lucide-react";
import { LogFilterState } from "@/lib/api/types";

interface LogFiltersProps {
  filters: LogFilterState;
  onFilterChange: <K extends keyof LogFilterState>(key: K, value: LogFilterState[K]) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  isOpen: boolean;
  totalFilteredCount: number;
}

export function LogFilters({
  filters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  isOpen,
  totalFilteredCount,
}: LogFiltersProps) {
  // Check active filter items for badge pills
  const activePills: { key: keyof LogFilterState; label: string; value: string }[] = [];

  if (filters.detected_format) {
    activePills.push({
      key: "detected_format",
      label: "Format",
      value: filters.detected_format.toUpperCase(),
    });
  }
  if (filters.severity) {
    activePills.push({
      key: "severity",
      label: "Severity",
      value: filters.severity.toUpperCase(),
    });
  }
  if (filters.action) {
    activePills.push({
      key: "action",
      label: "Action",
      value: filters.action.toUpperCase(),
    });
  }
  if (filters.protocol) {
    activePills.push({
      key: "protocol",
      label: "Protocol",
      value: filters.protocol.toUpperCase(),
    });
  }
  if (filters.source_ip) {
    activePills.push({
      key: "source_ip",
      label: "Src IP",
      value: filters.source_ip,
    });
  }
  if (filters.destination_ip) {
    activePills.push({
      key: "destination_ip",
      label: "Dst IP",
      value: filters.destination_ip,
    });
  }
  if (filters.start_time) {
    activePills.push({
      key: "start_time",
      label: "From",
      value: filters.start_time.replace("T", " "),
    });
  }
  if (filters.end_time) {
    activePills.push({
      key: "end_time",
      label: "To",
      value: filters.end_time.replace("T", " "),
    });
  }

  return (
    <div className="space-y-3">
      {/* Active Filter Summary Bar (Requirement 6) */}
      {activePills.length > 0 && (
        <div className="bg-purple-50/70 border border-purple-100/80 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-purple-900 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>Filters:</span>
            </span>

            {activePills.map((pill) => (
              <span
                key={pill.key}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-purple-200 text-purple-800 text-[11px] font-mono shadow-2xs"
              >
                <span className="font-semibold text-purple-500 font-sans">{pill.label}:</span>
                <span className="font-bold">{pill.value}</span>
                <button
                  type="button"
                  onClick={() => {
                    onFilterChange(pill.key, "");
                    setTimeout(onApplyFilters, 0);
                  }}
                  className="text-purple-400 hover:text-purple-700 ml-0.5 cursor-pointer"
                  title={`Remove ${pill.label} filter`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-purple-900 font-semibold">
              Results: <strong className="font-bold text-purple-700">{totalFilteredCount}</strong> events
            </span>
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      )}

      {/* Expandable Filter Controls Panel */}
      {isOpen && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-600" />
              <h3 className="text-sm font-extrabold text-slate-800">Advanced Server-Side Filters</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
              <button
                type="button"
                onClick={onApplyFilters}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>

          {/* Filter Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Format Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Log Format
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "", label: "ALL" },
                  { value: "json", label: "JSON" },
                  { value: "cef", label: "CEF" },
                  { value: "syslog", label: "Syslog" },
                  { value: "unknown", label: "Unknown" },
                ].map((fmt) => (
                  <button
                    key={fmt.value}
                    type="button"
                    onClick={() => onFilterChange("detected_format", fmt.value)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors border cursor-pointer ${
                      filters.detected_format === fmt.value
                        ? "bg-purple-50 text-purple-700 border-purple-200 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Severity Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Severity
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "", label: "ALL" },
                  { value: "critical", label: "Critical" },
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                  { value: "info", label: "Info" },
                ].map((sev) => (
                  <button
                    key={sev.value}
                    type="button"
                    onClick={() => onFilterChange("severity", sev.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                      filters.severity === sev.value
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Action Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Action
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "", label: "ALL" },
                  { value: "allow", label: "Allow" },
                  { value: "block", label: "Block" },
                  { value: "deny", label: "Deny" },
                  { value: "drop", label: "Drop" },
                  { value: "other", label: "Other" },
                ].map((act) => (
                  <button
                    key={act.value}
                    type="button"
                    onClick={() => onFilterChange("action", act.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors border cursor-pointer ${
                      filters.action === act.value
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {act.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Protocol Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Protocol
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: "", label: "ALL" },
                  { value: "tcp", label: "TCP" },
                  { value: "udp", label: "UDP" },
                  { value: "icmp", label: "ICMP" },
                  { value: "other", label: "Other" },
                ].map((proto) => (
                  <button
                    key={proto.value}
                    type="button"
                    onClick={() => onFilterChange("protocol", proto.value)}
                    className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-colors border cursor-pointer ${
                      filters.protocol === proto.value
                        ? "bg-amber-50 text-amber-800 border-amber-200 font-bold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {proto.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* IP & Date Range Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
            {/* Source IP */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Source IP</label>
              <input
                type="text"
                value={filters.source_ip}
                onChange={(e) => onFilterChange("source_ip", e.target.value)}
                placeholder="e.g. 10.0.0.15"
                className="w-full px-3 py-2 bg-slate-50 text-xs font-mono text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>

            {/* Destination IP */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500">Destination IP</label>
              <input
                type="text"
                value={filters.destination_ip}
                onChange={(e) => onFilterChange("destination_ip", e.target.value)}
                placeholder="e.g. 192.168.1.1"
                className="w-full px-3 py-2 bg-slate-50 text-xs font-mono text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>

            {/* Date Range Start */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>Start Time (UTC)</span>
              </label>
              <input
                type="datetime-local"
                value={filters.start_time}
                onChange={(e) => onFilterChange("start_time", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 text-xs font-mono text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>

            {/* Date Range End */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span>End Time (UTC)</span>
              </label>
              <input
                type="datetime-local"
                value={filters.end_time}
                onChange={(e) => onFilterChange("end_time", e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 text-xs font-mono text-slate-800 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
