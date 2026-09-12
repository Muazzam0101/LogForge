"use client";

import React from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Layers } from "lucide-react";
import { AnalyticsDistributions } from "@/lib/api/types";

interface LogSourcesProps {
  distributions: AnalyticsDistributions | null;
  isLoading: boolean;
  totalEvents: number;
}

// Brand color palette from reference image:
// JSON: Deep Dark Purple (#31234b)
// CEF: Vibrant Coral/Red (#ea384d)
// SYSLOG: Warm Amber/Yellow (#f59e0b)
// UNKNOWN: Slate/Gray (#94a3b8)
const FORMAT_COLORS: Record<string, string> = {
  JSON: "#31234b",
  CEF: "#ea384d",
  SYSLOG: "#f59e0b",
  UNKNOWN: "#94a3b8",
};

const DEFAULT_COLORS = ["#31234b", "#ea384d", "#f59e0b", "#6c5ce7", "#94a3b8"];

export function LogSources({
  distributions,
  isLoading,
  totalEvents,
}: LogSourcesProps) {
  const formatData = distributions?.format_distribution || [];
  const hasData = totalEvents > 0 && formatData.length > 0;

  const chartItems = formatData.map((item, idx) => ({
    name: item.name.toUpperCase(),
    value: item.count,
    percentage: item.percentage,
    color: FORMAT_COLORS[item.name.toUpperCase()] || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between h-full group">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">
            Event Format Distribution
          </h3>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            Parsed event formats
          </p>
        </div>

        <Link
          href="/explorer"
          className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
        >
          View All
        </Link>
      </div>

      {/* Body Content */}
      <div className="my-auto flex-1 flex items-center justify-center py-1">
        {isLoading ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-[11px] font-mono text-slate-400">Aggregating formats...</span>
          </div>
        ) : !hasData ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <Layers className="w-5 h-5 stroke-[1.8]" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No formats recorded</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Ingest logs to view format breakdown.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full gap-4">
            {/* Donut Chart */}
            <div className="relative w-32 h-32 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartItems}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {chartItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#1e1e24",
                      borderColor: "#333",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "11px",
                      fontFamily: "monospace",
                      padding: "5px 9px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-base font-extrabold text-slate-800 tracking-tight font-mono">
                  {totalEvents}
                </span>
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Logs
                </span>
              </div>
            </div>

            {/* Right Legend */}
            <div className="flex-1 space-y-2">
              {chartItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-slate-700 text-[11px] truncate">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
                    <span className="text-slate-800 font-bold">{item.value}</span>
                    <span className="text-slate-400 text-[10px]">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>ULPF Auto-detection</span>
        </span>
        <span className="font-mono text-slate-500">
          {formatData.length} Parser{formatData.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

