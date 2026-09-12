"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { AnalyticsSummary } from "@/lib/api/types";

interface SecurityAlertsProps {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

export function SecurityAlerts({ summary, isLoading }: SecurityAlertsProps) {
  const criticalCount = summary?.critical_severity_events || 0;
  const highCount = (summary?.high_severity_events || 0) - criticalCount;
  const totalElevated = summary?.high_severity_events || 0;

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Severity Telemetry
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Pre-correlation high/critical events
          </p>
        </div>

        <Link
          href="/explorer?severity=high"
          className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 group/btn transition-colors cursor-pointer"
        >
          <span>Filter in Explorer</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>

      {/* Table Structure */}
      <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Classification</th>
              <th className="py-3 px-3 text-right">Event Count</th>
              <th className="py-3 px-3 text-right">Severity</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3 px-3"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3 text-right"><div className="h-3 w-8 bg-slate-200 rounded ml-auto" /></td>
                  <td className="py-3 px-3 text-right"><div className="h-3 w-12 bg-slate-200 rounded ml-auto" /></td>
                </tr>
              ))
            ) : totalElevated === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center">
                  <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">
                      No elevated severity logs
                    </h4>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Zero high or critical severity events recorded in MySQL. Pre-correlation telemetry is clear.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                <tr className="hover:bg-rose-50/20 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>Critical Severity</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-rose-700">
                    {criticalCount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                      CRITICAL
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-amber-50/20 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>High Severity</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                    {Math.max(0, highCount).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                      HIGH
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50 transition-colors bg-slate-50/40">
                  <td className="py-3 px-3 font-semibold text-slate-800">
                    Blocked / Denied Traffic
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                    {(summary?.blocked_events || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                      ACTION
                    </span>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* Non-fabricated disclaimer */}
      <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
        AI threat correlation engine is scheduled for future phases. Counts reflect normalized UES severity attributes.
      </div>
    </div>
  );
}
