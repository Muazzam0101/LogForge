"use client";

import React from "react";
import { ArrowRight, Terminal } from "lucide-react";

export function RecentEvents() {
  const columns = [
    { label: "Time", width: "w-24" },
    { label: "Source IP", width: "w-28" },
    { label: "Destination IP", width: "w-28" },
    { label: "Event Type", width: "w-36" },
    { label: "Action", width: "w-20" },
    { label: "Source", width: "w-24" },
    { label: "Trace (SHA-256)", width: "w-28" },
  ];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Recent Events
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Normalized log stream with cryptographic traceability
          </p>
        </div>

        <button className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group/btn transition-colors">
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
        </button>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full min-w-[620px] text-left text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              {columns.map((col) => (
                <th key={col.label} className={`py-3 px-4 ${col.width}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110">
                    <Terminal className="w-5 h-5 animate-calm-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    No events processed yet
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Processed events will appear here once logs are ingested and normalized.
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
