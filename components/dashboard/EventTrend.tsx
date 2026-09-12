"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { BarChart2, UploadCloud, ChevronDown } from "lucide-react";
import { TrendPoint } from "@/lib/api/types";

interface EventTrendProps {
  trends: TrendPoint[];
  isLoading: boolean;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  onUploadClick?: () => void;
}

export function EventTrend({
  trends,
  isLoading,
  timeRange,
  onTimeRangeChange,
  onUploadClick,
}: EventTrendProps) {
  const hasData = trends && trends.length > 0 && trends.some((t) => t.ingested > 0);

  // Format timestamp for display on XAxis
  const formattedData = (trends || []).map((point) => {
    let label = point.timestamp;
    if (point.timestamp.includes(" ")) {
      // e.g. "2026-09-12 20:00" -> "20:00"
      label = point.timestamp.split(" ")[1] || point.timestamp;
    } else if (point.timestamp.includes("-")) {
      // e.g. "2026-09-12" -> "Sep 12"
      const parts = point.timestamp.split("-");
      if (parts.length === 3) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIdx = parseInt(parts[1], 10) - 1;
        label = `${monthNames[monthIdx] || parts[1]} ${parts[2]}`;
      }
    }
    return {
      ...point,
      displayTime: label,
    };
  });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Event Trends
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Normalized log stream volume over time
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-slate-600 cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
              Ingested & Normalized
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              High Severity
            </span>
          </div>

          {/* Timeframe selector buttons */}
          <div className="inline-flex items-center rounded-xl bg-slate-100/80 p-1 border border-slate-200/60">
            {[
              { id: "24h", label: "24h" },
              { id: "7d", label: "7d" },
              { id: "30d", label: "30d" },
            ].map((range) => (
              <button
                key={range.id}
                type="button"
                onClick={() => onTimeRangeChange(range.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeRange === range.id
                    ? "bg-white text-purple-700 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-64 w-full rounded-2xl bg-slate-50/40 p-4 border border-slate-100 flex flex-col justify-between overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono text-slate-400">Loading event trends...</span>
          </div>
        ) : !hasData ? (
          /* Clean Empty State (Requirement 16) */
          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-4 py-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs border border-purple-100 mb-3">
              <BarChart2 className="w-6 h-6 stroke-[1.8]" />
            </div>

            <h4 className="text-sm font-bold text-slate-800">
              No event data yet
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-3.5">
              No persistent events recorded in this time range. Ingest raw log streams to view live telemetry trends.
            </p>
            {onUploadClick && (
              <button
                type="button"
                onClick={onUploadClick}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-all cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Logs</span>
              </button>
            )}
          </div>
        ) : (
          /* Recharts Area Chart */
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ingestedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="alertsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="displayTime"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "12px",
                    color: "#f8fafc",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ fontWeight: "bold", color: "#a855f7" }}
                />
                <Area
                  type="monotone"
                  dataKey="ingested"
                  stroke="#9333ea"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#ingestedGradient)"
                  name="Ingested Events"
                />
                <Area
                  type="monotone"
                  dataKey="alerts"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#alertsGradient)"
                  name="High/Crit Severity"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
