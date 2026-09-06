"use client";

import React from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function SecurityAlerts() {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Top Security Alerts
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Real-time threat detection matrix
          </p>
        </div>

        <button className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group/btn transition-colors">
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
        </button>
      </div>

      {/* Table Structure */}
      <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3 w-8">#</th>
              <th className="py-3 px-3">Alert Type</th>
              <th className="py-3 px-3 text-right">Count</th>
              <th className="py-3 px-3 text-right">Severity</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={4} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center max-w-xs mx-auto">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
                    <ShieldCheck className="w-5 h-5 animate-calm-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No security alerts
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Threat detections will appear here once analytics are enabled.
                  </p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
