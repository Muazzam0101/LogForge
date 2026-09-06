"use client";

import React from "react";
import { Cpu, Database, Brain, HardDrive, ShieldCheck } from "lucide-react";

interface StatusItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: string;
  state: "standby" | "unconfigured";
}

const statusItems: StatusItem[] = [
  {
    name: "Log Processor",
    icon: Cpu,
    status: "Standby",
    state: "standby",
  },
  {
    name: "Database",
    icon: Database,
    status: "Not connected",
    state: "unconfigured",
  },
  {
    name: "AI Engine",
    icon: Brain,
    status: "Awaiting configuration",
    state: "unconfigured",
  },
  {
    name: "Storage",
    icon: HardDrive,
    status: "Standby",
    state: "standby",
  },
];

export function SystemStatus() {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between h-full group">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-extrabold text-slate-800 text-sm tracking-tight">
            System Status
          </h3>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            </span>
            <span>Standby Mode</span>
          </div>
        </div>

        {/* Services List with Micro Hover Animations */}
        <div className="space-y-2.5">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="group/item flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-all duration-200 border border-transparent hover:border-slate-100 hover:translate-x-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 group-hover/item:bg-purple-100/80 text-purple-600 flex items-center justify-center transition-colors">
                    <Icon className="w-4 h-4 transition-transform duration-200 group-hover/item:scale-110" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover/item:text-slate-900 transition-colors">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-400">
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
          <span>Air-gapped ready</span>
        </div>
        <span className="text-[11px] font-medium text-slate-400">
          NTRO ULPF 1.0
        </span>
      </div>
    </div>
  );
}
