"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { ArrowRight, Sliders, Layers, Shield, Network } from "lucide-react";
import { AnalyticsDistributions } from "@/lib/api/types";

interface LogSourcesProps {
  distributions: AnalyticsDistributions | null;
  isLoading: boolean;
  totalEvents: number;
}

const FORMAT_COLORS: Record<string, string> = {
  JSON: "#9333ea",
  CEF: "#2563eb",
  SYSLOG: "#0d9488",
  UNKNOWN: "#64748b",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#e11d48",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#3b82f6",
  INFO: "#64748b",
  INFORMATIONAL: "#64748b",
  UNCLASSIFIED: "#94a3b8",
};

const PALETTE = ["#9333ea", "#2563eb", "#0d9488", "#f97316", "#e11d48", "#64748b"];

export function LogSources({
  distributions,
  isLoading,
  totalEvents,
}: LogSourcesProps) {
  const [activeTab, setActiveTab] = useState<"format" | "severity" | "action" | "endpoints">("format");

  const formatData = distributions?.format_distribution || [];
  const severityData = distributions?.severity_distribution || [];
  const actionData = distributions?.action_distribution || [];
  const topSources = distributions?.top_source_ips || [];

  const hasData = totalEvents > 0;

  // Select active chart data
  let currentChartData = formatData;
  let colorMap: Record<string, string> = FORMAT_COLORS;

  if (activeTab === "severity") {
    currentChartData = severityData;
    colorMap = SEVERITY_COLORS;
  } else if (activeTab === "action") {
    currentChartData = actionData;
    colorMap = {};
  }

  const chartItems = currentChartData.map((item, idx) => ({
    name: item.name,
    value: item.count,
    percentage: item.percentage,
    color: colorMap[item.name.toUpperCase()] || PALETTE[idx % PALETTE.length],
  }));

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Log Distributions
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Breakdown across heterogeneous stored events
          </p>
        </div>

        <Link
          href="/explorer"
          className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group/btn transition-colors"
        >
          <span>Explore</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-100 pb-2 mb-3">
        {[
          { id: "format", label: "Formats" },
          { id: "severity", label: "Severity" },
          { id: "action", label: "Actions" },
          { id: "endpoints", label: "Top IPs" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeTab === tab.id
                ? "bg-purple-50 text-purple-700 font-bold"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body Content */}
      <div className="my-2 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-xs font-mono text-slate-400">Computing distributions...</span>
          </div>
        ) : !hasData ? (
          /* Empty State */
          <div className="p-8 text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">No telemetry recorded</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Ingest logs via the pipeline to view real format and severity breakdowns.
            </p>
          </div>
        ) : activeTab === "endpoints" ? (
          /* Top Source IPs List */
          <div className="space-y-2 py-1">
            {topSources.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No source IP addresses detected</p>
            ) : (
              topSources.map((endpoint, idx) => (
                <div
                  key={endpoint.ip}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 font-bold text-[10px] flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <span className="font-mono text-slate-800 font-semibold">{endpoint.ip}</span>
                  </div>
                  <span className="font-mono text-purple-700 font-bold">
                    {endpoint.count} events
                  </span>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Donut Chart + Breakdown Legend */
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
            <div className="relative w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartItems}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartItems.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "10px",
                      color: "#f8fafc",
                      fontSize: "11px",
                      fontFamily: "monospace",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl font-extrabold text-slate-800 tracking-tight font-mono">
                  {totalEvents}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  Total Logs
                </span>
              </div>
            </div>

            {/* Legend List */}
            <div className="flex-1 space-y-1.5 w-full">
              {chartItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between text-xs p-1 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-medium text-slate-700 text-xs">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-500 font-bold">{item.value}</span>
                    <span className="text-slate-400">({item.percentage}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer summary */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Real MySQL aggregation</span>
        </div>
        <span className="font-medium text-purple-700 text-[11px]">
          {hasData ? `${totalEvents} events processed` : "Zero events stored"}
        </span>
      </div>
    </div>
  );
}
