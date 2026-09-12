"use client";

import React from "react";
import { FileText, Database, ShieldAlert, Ban, Minus, Network, ShieldCheck } from "lucide-react";
import { AnalyticsSummary } from "@/lib/api/types";

interface MetricCardsProps {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

export function MetricCards({ summary, isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-start gap-4 animate-pulse"
          >
            <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-16 bg-slate-200 rounded" />
              <div className="h-2.5 w-32 bg-slate-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      id: "total_events",
      title: "Total Events Stored",
      value: summary !== null ? summary.total_events.toLocaleString() : "--",
      subtitle:
        summary !== null && summary.total_events > 0
          ? `${summary.events_today.toLocaleString()} ingested today`
          : "Zero events in MySQL",
      icon: Database,
      iconBg: "bg-purple-50 border-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "events_24h",
      title: "Events in Last 24h",
      value: summary !== null ? summary.events_last_24h.toLocaleString() : "--",
      subtitle:
        summary !== null && summary.events_last_24h > 0
          ? "Trailing 24-hour stream"
          : "No logs in last 24h",
      icon: FileText,
      iconBg: "bg-blue-50 border-blue-100",
      iconColor: "text-blue-600",
    },
    {
      id: "blocked_events",
      title: "Blocked / Deny Actions",
      value: summary !== null ? summary.blocked_events.toLocaleString() : "--",
      subtitle:
        summary !== null && summary.blocked_events > 0
          ? "Perimeter dropped traffic"
          : "Zero blocks recorded",
      icon: Ban,
      iconBg: "bg-amber-50 border-amber-100",
      iconColor: "text-amber-600",
    },
    {
      id: "high_severity",
      title: "High / Critical Events",
      value: summary !== null ? summary.high_severity_events.toLocaleString() : "--",
      subtitle:
        summary !== null && summary.critical_severity_events > 0
          ? `${summary.critical_severity_events} critical severity`
          : summary !== null && summary.high_severity_events > 0
          ? "Elevated severity logs"
          : "Zero high severity events",
      icon: ShieldAlert,
      iconBg: "bg-rose-50 border-rose-100",
      iconColor: "text-rose-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-purple-200/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex items-start gap-4 cursor-default"
          >
            <div
              className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:shadow-xs ${item.iconBg} ${item.iconColor}`}
            >
              <Icon className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate transition-colors group-hover:text-slate-700">
                {item.title}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
                  {item.value}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <Minus className="w-3 h-3 text-slate-300 shrink-0" />
                <span className="truncate">{item.subtitle}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
