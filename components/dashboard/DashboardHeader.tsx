"use client";

import React from "react";
import { RefreshCw, Calendar, ChevronDown } from "lucide-react";

interface DashboardHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
}

export function DashboardHeader({
  onRefresh,
  isRefreshing,
  lastUpdated,
  timeRange = "24h",
  onTimeRangeChange,
}: DashboardHeaderProps) {

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
      {/* Left Title & Subtitle from Reference Image */}
      <div className="space-y-1">
        <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase block">
          DASHBOARD
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Security through <span className="text-orange-600">Smarter Logs.</span>
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-500">
          Ingest. Normalize. Detect. Investigate. Stay Secure.
        </p>
      </div>

      {/* Right Quote & Time Range Selector from Reference Image */}
      <div className="flex items-center gap-4 sm:gap-6 self-start md:self-auto">
        {/* Quote Block */}
        <div className="hidden lg:block border-l-2 border-orange-500 pl-3.5 py-0.5 text-left">
          <p className="text-xs text-slate-600 italic leading-snug">
            &ldquo;Every log has a story.
            <br />
            We help you find what matters.&rdquo;
          </p>
          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">&mdash; LogForge</span>
        </div>

        {/* Time Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{timeRange === "24h" ? "Last 24 Hours" : timeRange === "7d" ? "Last 7 Days" : "Last 30 Days"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title={lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : "Refresh"}
              aria-label="Refresh telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-orange-600" : ""}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

