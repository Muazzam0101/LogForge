"use client";

import React, { useState } from "react";
import {
  Eye,
  Lock,
  ArrowRight,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import { StoredEventSummary } from "@/lib/api/types";

interface LogTableProps {
  events: StoredEventSummary[];
  isLoading: boolean;
  onInspectEvent: (eventId: string) => void;
}

export function LogTable({ events, isLoading, onInspectEvent }: LogTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(eventId);
    setCopiedId(eventId);
    setTimeout(() => setCopiedId(null), 1500);
  };

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

  const getActionBadge = (action: string | null) => {
    if (!action) return <span className="text-slate-300">--</span>;
    const a = action.toLowerCase();
    let color = "bg-slate-100 text-slate-700 border-slate-200";
    if (a.includes("allow") || a.includes("pass") || a.includes("permit")) {
      color = "bg-emerald-50 text-emerald-700 border-emerald-200";
    } else if (a.includes("block") || a.includes("drop") || a.includes("deny") || a.includes("reject")) {
      color = "bg-rose-50 text-rose-700 border-rose-200";
    }
    return (
      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${color}`}>
        {action}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <th className="py-3 px-4">Timestamp</th>
            <th className="py-3 px-4">Event ID</th>
            <th className="py-3 px-4">Format</th>
            <th className="py-3 px-4">Source IP</th>
            <th className="py-3 px-4">Destination IP</th>
            <th className="py-3 px-4">Protocol</th>
            <th className="py-3 px-4">Action</th>
            <th className="py-3 px-4">Severity</th>
            <th className="py-3 px-4">SHA-256 Digest</th>
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 font-mono">
          {/* Skeleton Loading State (Requirement 10) */}
          {isLoading ? (
            Array.from({ length: 8 }).map((_, idx) => (
              <tr key={`skeleton-${idx}`} className="animate-pulse">
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-24 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-4 w-28 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-4 w-12 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-20 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-20 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-10 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-4 w-14 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-4 w-16 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4">
                  <div className="h-3.5 w-24 bg-slate-200 rounded-md" />
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="h-6 w-14 bg-slate-200 rounded-lg ml-auto" />
                </td>
              </tr>
            ))
          ) : (
            events.map((evt) => (
              <tr
                key={evt.event_id}
                onClick={() => onInspectEvent(evt.event_id)}
                className="hover:bg-purple-50/25 transition-colors group cursor-pointer"
              >
                {/* 1. Timestamp */}
                <td className="py-3.5 px-4 text-slate-500 font-sans text-xs whitespace-nowrap">
                  {evt.timestamp
                    ? new Date(evt.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })
                    : "--"}
                </td>

                {/* 2. Event ID (with quick copy) */}
                <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 bg-purple-50/80 px-2 py-0.5 rounded-md border border-purple-100/70">
                    <span className="font-mono text-[11px] text-purple-700">
                      {evt.event_id.slice(0, 8)}...{evt.event_id.slice(-4)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(e, evt.event_id)}
                      className="text-purple-400 hover:text-purple-700 cursor-pointer"
                      title="Copy full UUID"
                    >
                      {copiedId === evt.event_id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </td>

                {/* 3. Format */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60">
                    {evt.detected_format}
                  </span>
                </td>

                {/* 4. Source IP */}
                <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap text-xs">
                  {evt.source_ip ? (
                    <span>
                      {evt.source_ip}
                      {evt.source_port ? `:${evt.source_port}` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-300">--</span>
                  )}
                </td>

                {/* 5. Destination IP */}
                <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap text-xs">
                  {evt.destination_ip ? (
                    <span>
                      {evt.destination_ip}
                      {evt.destination_port ? `:${evt.destination_port}` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-300">--</span>
                  )}
                </td>

                {/* 6. Protocol */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {evt.protocol ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
                      {evt.protocol}
                    </span>
                  ) : (
                    <span className="text-slate-300">--</span>
                  )}
                </td>

                {/* 7. Action */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  {getActionBadge(evt.action)}
                </td>

                {/* 8. Severity */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                      evt.severity
                    )}`}
                  >
                    {evt.severity || "UNCLASSIFIED"}
                  </span>
                </td>

                {/* 9. SHA-256 Digest */}
                <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-[11px] truncate max-w-[90px]" title={evt.sha256_hash}>
                      {evt.sha256_hash.slice(0, 10)}...
                    </span>
                  </div>
                </td>

                {/* 10. Actions (Inspect) */}
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInspectEvent(evt.event_id);
                    }}
                    className="px-2.5 py-1 text-[11px] font-semibold text-purple-700 hover:text-white bg-purple-50 hover:bg-purple-600 rounded-lg transition-colors border border-purple-200 hover:border-purple-600 inline-flex items-center gap-1 cursor-pointer"
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
  );
}
