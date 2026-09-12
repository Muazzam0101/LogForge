"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Terminal, Lock, Eye } from "lucide-react";
import { StoredEventSummary } from "@/lib/api/types";

interface RecentEventsProps {
  events: StoredEventSummary[];
  isLoading: boolean;
  onInspectEvent: (eventId: string) => void;
}

export function RecentEvents({
  events,
  isLoading,
  onInspectEvent,
}: RecentEventsProps) {
  const getSeverityBadge = (sev: string | null) => {
    const s = (sev || "unknown").toLowerCase();
    if (s.includes("crit") || s.includes("fatal")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (s.includes("high") || s.includes("err")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s.includes("med") || s.includes("warn")) {
      return "bg-amber-50/70 text-amber-600 border-amber-200/60";
    }
    if (s.includes("low")) {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Recent Events
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Normalized live log stream with cryptographic traceability
          </p>
        </div>

        <Link
          href="/explorer"
          className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group/btn transition-colors cursor-pointer"
        >
          <span>View All in Explorer</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
        </Link>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-100">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Format</th>
              <th className="py-3 px-4">Source IP</th>
              <th className="py-3 px-4">Destination IP</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">SHA-256 Digest</th>
              <th className="py-3 px-4 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`sk-${idx}`} className="animate-pulse">
                  <td className="py-3.5 px-4"><div className="h-3 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3 w-12 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-4 w-14 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-3.5 px-4 text-right"><div className="h-5 w-12 bg-slate-200 rounded ml-auto" /></td>
                </tr>
              ))
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                      <Terminal className="w-5 h-5" />
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
            ) : (
              events.map((evt) => (
                <tr
                  key={evt.event_id}
                  onClick={() => onInspectEvent(evt.event_id)}
                  className="hover:bg-purple-50/20 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4 text-slate-500 font-sans text-xs whitespace-nowrap">
                    {evt.timestamp
                      ? new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                      : "--"}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {evt.detected_format}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {evt.source_ip || "--"}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                    {evt.destination_ip || "--"}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {evt.action ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {evt.action}
                      </span>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                        evt.severity
                      )}`}
                    >
                      {evt.severity || "UNCLASSIFIED"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-500" />
                      <span className="text-[11px] truncate max-w-[80px]" title={evt.sha256_hash}>
                        {evt.sha256_hash.slice(0, 8)}...
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectEvent(evt.event_id);
                      }}
                      className="px-2 py-1 text-[11px] font-semibold text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-600 rounded-lg transition-colors border border-purple-200 hover:border-purple-600 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
