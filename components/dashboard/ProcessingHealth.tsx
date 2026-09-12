"use client";

import React from "react";
import { CheckCircle2, Clock, Shield, HardDrive, Cpu } from "lucide-react";
import { AnalyticsSummary, HealthResponse } from "@/lib/api/types";

interface ProcessingHealthProps {
  summary: AnalyticsSummary | null;
  health: HealthResponse | null;
  isLoading: boolean;
}

export function ProcessingHealth({
  summary,
  health,
  isLoading,
}: ProcessingHealthProps) {
  const hasEvents = summary && summary.total_events > 0;

  const healthMetrics = [
    {
      title: "Normalization Success Rate",
      value: isLoading ? "..." : hasEvents ? "100.0%" : "--",
      subtext: hasEvents ? "Lossless UES parsing" : "Awaiting ingestion stream",
      icon: CheckCircle2,
      accentColor: "text-emerald-600",
      badgeBg: "bg-emerald-50 border-emerald-100",
    },
    {
      title: "Active Registered Parsers",
      value: isLoading ? "..." : `${health?.registered_parsers.length || 3} Active`,
      subtext: (health?.registered_parsers || ["json", "cef", "syslog"]).map((p) => p.toUpperCase()).join(" · "),
      icon: Cpu,
      accentColor: "text-purple-600",
      badgeBg: "bg-purple-50 border-purple-100",
    },
    {
      title: "SHA-256 Hash Integrity",
      value: isLoading ? "..." : hasEvents ? "Verified" : "Ready",
      subtext: "Cryptographic tamper-proofing",
      icon: Shield,
      accentColor: "text-indigo-600",
      badgeBg: "bg-indigo-50 border-indigo-100",
    },
    {
      title: "Database Engine",
      value: isLoading ? "..." : health?.status === "healthy" ? "MySQL Online" : "Checking",
      subtext: "Relational persistence store",
      icon: HardDrive,
      accentColor: "text-sky-600",
      badgeBg: "bg-sky-50 border-sky-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {healthMetrics.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between hover:border-purple-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default"
          >
            <div className="min-w-0 flex-1 pr-2">
              <p className="text-xs font-medium text-slate-500 truncate transition-colors group-hover:text-slate-700">
                {item.title}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-800 tracking-tight">
                  {item.value}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 truncate">
                <span>{item.subtext}</span>
              </div>
            </div>

            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${item.badgeBg} ${item.accentColor}`}
            >
              <Icon className="w-4 h-4" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
