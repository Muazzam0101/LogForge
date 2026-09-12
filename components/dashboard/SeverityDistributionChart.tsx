"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { DistributionItem } from "@/lib/api/types";

interface SeverityDistributionChartProps {
  severityDistribution: DistributionItem[] | null;
  isLoading: boolean;
  totalEvents: number;
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; color: string; bgBar: string }
> = {
  CRITICAL: {
    label: "Critical",
    color: "#ea384d",
    bgBar: "bg-red-500",
  },
  HIGH: {
    label: "High",
    color: "#f97316",
    bgBar: "bg-orange-500",
  },
  MEDIUM: {
    label: "Medium",
    color: "#f59e0b",
    bgBar: "bg-amber-400",
  },
  LOW: {
    label: "Low",
    color: "#6366f1",
    bgBar: "bg-indigo-400",
  },
  INFO: {
    label: "Info",
    color: "#94a3b8",
    bgBar: "bg-slate-300",
  },
  INFORMATIONAL: {
    label: "Info",
    color: "#94a3b8",
    bgBar: "bg-slate-300",
  },
  UNCLASSIFIED: {
    label: "Unclass",
    color: "#cbd5e1",
    bgBar: "bg-slate-200",
  },
};

export function SeverityDistributionChart({
  severityDistribution,
  isLoading,
  totalEvents,
}: SeverityDistributionChartProps) {
  const items = severityDistribution || [];
  const hasData = totalEvents > 0 && items.length > 0;

  // Standard ordered buckets
  const orderedKeys = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
  const countsByKey: Record<string, { count: number; percentage: number }> = {};

  items.forEach((item) => {
    let key = item.name.toUpperCase();
    if (key === "INFORMATIONAL") key = "INFO";
    countsByKey[key] = {
      count: item.count,
      percentage: item.percentage,
    };
  });

  const displayData = orderedKeys.map((k) => {
    const data = countsByKey[k] || { count: 0, percentage: 0 };
    const config = SEVERITY_CONFIG[k] || {
      label: k,
      color: "#94a3b8",
      bgBar: "bg-slate-300",
    };
    return {
      key: k,
      label: config.label,
      color: config.color,
      bgBar: config.bgBar,
      count: data.count,
      percentage: data.percentage,
    };
  });

  const maxCount = Math.max(...displayData.map((d) => d.count), 1);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between h-full group">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">
            Severity Distribution
          </h3>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            Breakdown by alert level
          </p>
        </div>

        <Link
          href="/explorer"
          className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
        >
          View All
        </Link>
      </div>

      {/* Vertical Bar Chart Body */}
      <div className="my-auto flex-1 flex flex-col justify-end py-1">
        {isLoading ? (
          <div className="p-6 text-center space-y-2 my-auto">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-[11px] font-mono text-slate-400">Loading severities...</span>
          </div>
        ) : !hasData ? (
          <div className="p-6 text-center space-y-2 my-auto">
            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto border border-slate-100">
              <ShieldAlert className="w-5 h-5 stroke-[1.8]" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No severity metrics</h4>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Ingest logs to observe real security levels.
            </p>
          </div>
        ) : (
          <div className="w-full flex items-end justify-between gap-2 pt-4 px-1 h-36">
            {displayData.map((col) => {
              const heightPct = col.count > 0 ? Math.max(Math.round((col.count / maxCount) * 100), 12) : 6;

              return (
                <div
                  key={col.key}
                  className="flex-1 flex flex-col items-center justify-end h-full group/col"
                >
                  {/* Top value */}
                  <span className="text-[10px] font-mono font-bold text-slate-700 mb-1 group-hover/col:text-slate-900 transition-colors">
                    {col.count}
                  </span>

                  {/* Proportional vertical bar */}
                  <div className="w-full max-w-[28px] h-24 bg-slate-100/70 rounded-t-lg relative flex items-end overflow-hidden">
                    <div
                      className={`w-full rounded-t-lg transition-all duration-500`}
                      style={{
                        height: `${heightPct}%`,
                        backgroundColor: col.color,
                      }}
                    />
                  </div>

                  {/* Label */}
                  <span className="text-[10px] font-semibold text-slate-500 mt-2 truncate w-full text-center">
                    {col.label}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400">
                    {col.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>Threat Prioritization</span>
        </span>
        <span className="font-mono text-slate-500">
          {(countsByKey["CRITICAL"]?.count || 0) + (countsByKey["HIGH"]?.count || 0)} Critical/High
        </span>
      </div>
    </div>
  );
}
