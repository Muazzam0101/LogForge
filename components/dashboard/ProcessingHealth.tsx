"use client";

import React from "react";
import { CheckCircle2, Clock, Brain, HardDrive, Minus } from "lucide-react";

interface HealthMetric {
  title: string;
  value: string;
  subtext: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
}

const healthMetrics: HealthMetric[] = [
  {
    title: "Parsing Success Rate",
    value: "--",
    subtext: "Awaiting data stream",
    icon: CheckCircle2,
    accentColor: "text-indigo-600",
    badgeBg: "bg-indigo-50 border-indigo-100",
  },
  {
    title: "Avg Processing Time",
    value: "--",
    subtext: "Awaiting data stream",
    icon: Clock,
    accentColor: "text-sky-600",
    badgeBg: "bg-sky-50 border-sky-100",
  },
  {
    title: "AI Detections",
    value: "--",
    subtext: "Model standby",
    icon: Brain,
    accentColor: "text-purple-600",
    badgeBg: "bg-purple-50 border-purple-100",
  },
  {
    title: "Storage Allocated",
    value: "--",
    subtext: "Awaiting volume mount",
    icon: HardDrive,
    accentColor: "text-slate-600",
    badgeBg: "bg-slate-50 border-slate-200",
  },
];

export function ProcessingHealth() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {healthMetrics.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="group bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between hover:border-purple-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-default"
          >
            <div>
              <p className="text-xs font-medium text-slate-500 transition-colors group-hover:text-slate-700">
                {item.title}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold text-slate-800 tracking-tight">
                  {item.value}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <Minus className="w-2.5 h-2.5 text-slate-300" />
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
