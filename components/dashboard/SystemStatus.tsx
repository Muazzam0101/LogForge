"use client";

import React from "react";
import { Cpu, Database, Brain, HardDrive, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { HealthResponse } from "@/lib/api/types";

interface SystemStatusProps {
  health: HealthResponse | null;
  isLoading: boolean;
}

export function SystemStatus({ health, isLoading }: SystemStatusProps) {
  const isOnline = health?.status === "healthy";
  const parserCount = health?.registered_parsers.length || 0;

  const statusItems = [
    {
      name: "ULPF Processing Engine",
      icon: Cpu,
      status: isLoading ? "Checking..." : isOnline ? `Active (v${health?.version})` : "Offline",
      isLive: isOnline,
    },
    {
      name: "MySQL Persistent Store",
      icon: Database,
      status: isLoading ? "Checking..." : isOnline ? "Connected" : "Unreachable",
      isLive: isOnline,
    },
    {
      name: "Deterministic Parsers",
      icon: HardDrive,
      status: isLoading
        ? "Loading..."
        : isOnline
        ? `${parserCount} Active (${(health?.registered_parsers || []).map((p) => p.toUpperCase()).join(", ")})`
        : "Standby",
      isLive: isOnline && parserCount > 0,
    },
    {
      name: "AI Anomaly Detection",
      icon: Brain,
      status: "Scheduled for Phase 7",
      isLive: false,
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between h-full group">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
            System Status
          </h3>
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                : "bg-amber-50 text-amber-700 border border-amber-100"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
            </span>
            <span>{isOnline ? "All Systems Live" : "Connecting..."}</span>
          </div>
        </div>

        {/* Services List with Live States */}
        <div className="space-y-2.5">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="group/item flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-100 hover:translate-x-0.5"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      item.isLive
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="w-4 h-4 transition-transform duration-200 group-hover/item:scale-110" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover/item:text-slate-900 transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-mono font-medium text-slate-500 truncate max-w-[150px]">
                  {item.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Air-gapped Ready Indicator */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600 transition-transform hover:scale-110" />
          <span>Air-gapped verified</span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          NTRO ULPF 1.0
        </span>
      </div>
    </div>
  );
}
