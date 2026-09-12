"use client";

import React from "react";
import { Database, Clock, Shield, AlertTriangle, Network } from "lucide-react";
import { AnalyticsSummary } from "@/lib/api/types";

interface MetricCardsProps {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

export function MetricCards({ summary, isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-2xl p-4.5 border border-slate-150 shadow-2xs flex items-center justify-between gap-3 animate-pulse min-h-[110px]"
          >
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="h-6 w-16 bg-slate-200 rounded" />
              <div className="h-2.5 w-24 bg-slate-100 rounded" />
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      id: "total_events",
      title: "Total Events",
      value: summary !== null ? summary.total_events.toLocaleString() : "--",
      trend: "↑ 12%",
      trendLabel: "vs. previous period",
      icon: Database,
      iconBg: "bg-orange-50/90 text-orange-600 border-orange-100",
      sparkColor: "bg-orange-500",
      bars: [30, 45, 35, 60, 50, 75, 95],
    },
    {
      id: "events_24h",
      title: "Events (24h)",
      value: summary !== null ? summary.events_last_24h.toLocaleString() : "--",
      trend: "↑ 8%",
      trendLabel: "vs. previous period",
      icon: Clock,
      iconBg: "bg-purple-50/90 text-purple-600 border-purple-100",
      sparkColor: "bg-purple-500",
      bars: [40, 35, 55, 45, 65, 80, 70],
    },
    {
      id: "blocked_events",
      title: "Blocked Events",
      value: summary !== null ? summary.blocked_events.toLocaleString() : "--",
      trend: "↑ 15%",
      trendLabel: "vs. previous period",
      icon: Shield,
      iconBg: "bg-rose-50/90 text-rose-600 border-rose-100",
      sparkColor: "bg-rose-500",
      bars: [25, 40, 50, 35, 60, 70, 85],
    },
    {
      id: "high_critical",
      title: "High / Critical",
      value: summary !== null ? summary.high_severity_events.toLocaleString() : "--",
      trend: "↑ 22%",
      trendLabel: "vs. previous period",
      icon: AlertTriangle,
      iconBg: "bg-amber-50/90 text-amber-600 border-amber-100",
      sparkColor: "bg-amber-500",
      bars: [30, 45, 40, 55, 50, 70, 65],
    },
    {
      id: "active_sources",
      title: "Active Sources",
      value: summary !== null ? summary.active_sources_count.toLocaleString() : "--",
      trend: "↑ 5%",
      trendLabel: "vs. previous period",
      icon: Network,
      iconBg: "bg-indigo-50/90 text-indigo-600 border-indigo-100",
      sparkColor: "bg-indigo-500",
      bars: [45, 50, 60, 55, 70, 85, 90],
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className="bg-white rounded-2xl p-4.5 border border-slate-150 shadow-2xs hover:shadow-xs hover:border-slate-200 transition-all flex flex-col justify-between min-h-[118px] group"
          >
            {/* Top row: Title + Round Icon */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-slate-500">
                {card.title}
              </span>
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${card.iconBg}`}
              >
                <Icon className="w-4 h-4" />
              </div>
            </div>

            {/* Middle: Big Metric Value */}
            <div className="mt-1">
              <span className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight block leading-none">
                {card.value}
              </span>
            </div>

            {/* Bottom row: Trend Percentage + Sparkline Bars */}
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="flex items-center gap-1 text-[11px]">
                <span className="font-semibold text-emerald-600">{card.trend}</span>
                <span className="text-slate-400 font-normal truncate">{card.trendLabel}</span>
              </div>

              {/* Mini Sparkline Bar Chart */}
              <div className="flex items-end gap-0.5 h-6 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                {card.bars.map((val, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${val}%` }}
                    className={`w-1 rounded-xs transition-all ${card.sparkColor} ${
                      idx === card.bars.length - 1 ? "opacity-100" : "opacity-50 hover:opacity-80"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

