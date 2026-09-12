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
import { BarChart2, UploadCloud } from "lucide-react";
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
      label = point.timestamp.split(" ")[1] || point.timestamp;
    } else if (point.timestamp.includes("-")) {
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
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between h-full group">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">
            Event Volume
          </h3>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            Normalized log stream volume
          </p>
        </div>

        {/* Time selector pills */}
        <div className="inline-flex items-center rounded-lg bg-slate-50 p-0.5 border border-slate-200/70">
          {[
            { id: "24h", label: "24h" },
            { id: "7d", label: "7d" },
            { id: "30d", label: "30d" },
          ].map((range) => (
            <button
              key={range.id}
              type="button"
              onClick={() => onTimeRangeChange(range.id)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                timeRange === range.id
                  ? "bg-white text-orange-600 shadow-xs"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative h-48 w-full rounded-xl bg-slate-50/30 p-2 border border-slate-50 flex flex-col justify-between overflow-hidden">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-2">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[11px] font-mono text-slate-400">Loading volume trends...</span>
          </div>
        ) : !hasData ? (
          <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-4 py-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs border border-orange-100 mb-2">
              <BarChart2 className="w-5 h-5 stroke-[1.8]" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">
              No event volume recorded
            </h4>
            <p className="text-[11px] text-slate-400 max-w-xs mt-0.5 mb-2.5">
              Ingest raw log streams to view telemetry trends.
            </p>
            {onUploadClick && (
              <button
                type="button"
                onClick={onUploadClick}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-semibold border border-orange-200 transition-all cursor-pointer"
              >
                <UploadCloud className="w-3 h-3" />
                <span>Upload Logs</span>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="eventVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f95738" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f95738" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="alertVolumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ea384d" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ea384d" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayTime"
                  stroke="#94a3b8"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e1e24",
                    borderColor: "#333",
                    borderRadius: "10px",
                    color: "#f8fafc",
                    fontSize: "11px",
                    fontFamily: "monospace",
                    padding: "6px 10px",
                  }}
                  itemStyle={{ color: "#f8fafc" }}
                  labelStyle={{ fontWeight: "bold", color: "#f95738" }}
                />
                <Area
                  type="monotone"
                  dataKey="ingested"
                  stroke="#f95738"
                  strokeWidth={2.2}
                  fillOpacity={1}
                  fill="url(#eventVolumeGradient)"
                  name="Ingested Events"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Card Footer Indicator */}
      <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500" />
          <span>Real-time Ingest Rate</span>
        </span>
        <span className="font-mono font-medium text-slate-600">
          {formattedData.reduce((acc, curr) => acc + (curr.ingested || 0), 0)} Total
        </span>
      </div>
    </div>
  );
}

