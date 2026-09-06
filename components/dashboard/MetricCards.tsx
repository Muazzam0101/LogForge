"use client";

import React from "react";
import { FileText, Database, AlertTriangle, Network, Minus } from "lucide-react";

interface MetricItem {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
}

const metrics: MetricItem[] = [
  {
    id: "ingested",
    title: "Total Logs Ingested",
    value: "--",
    subtitle: "No ingestion stream",
    icon: FileText,
    iconBg: "bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
  },
  {
    id: "normalized",
    title: "Normalized Events",
    value: "--",
    subtitle: "Awaiting parser pipeline",
    icon: Database,
    iconBg: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-600",
  },
  {
    id: "alerts",
    title: "Security Alerts",
    value: "--",
    subtitle: "Threat engine standby",
    icon: AlertTriangle,
    iconBg: "bg-rose-50 border-rose-100",
    iconColor: "text-rose-600",
  },
  {
    id: "sources",
    title: "Active Sources",
    value: "--",
    subtitle: "0 connected",
    icon: Network,
    iconBg: "bg-purple-50 border-purple-100",
    iconColor: "text-purple-600",
  },
];

export function MetricCards() {
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
                <Minus className="w-3 h-3 text-slate-300" />
                <span>{item.subtitle}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
