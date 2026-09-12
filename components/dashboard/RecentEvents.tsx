"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, Eye, ShieldCheck, Lock, MoreHorizontal } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const filteredEvents = events.filter((evt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (evt.source_ip && evt.source_ip.toLowerCase().includes(q)) ||
      (evt.destination_ip && evt.destination_ip.toLowerCase().includes(q)) ||
      (evt.action && evt.action.toLowerCase().includes(q)) ||
      (evt.severity && evt.severity.toLowerCase().includes(q)) ||
      (evt.detected_format && evt.detected_format.toLowerCase().includes(q)) ||
      (evt.event_id && evt.event_id.toLowerCase().includes(q))
    );
  });

  const getSeverityBadge = (sev: string | null) => {
    const s = (sev || "unknown").toLowerCase();
    if (s.includes("crit") || s.includes("fatal")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (s.includes("high") || s.includes("err")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (s.includes("med") || s.includes("warn")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s.includes("low")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getActionBadge = (action: string | null) => {
    const a = (action || "").toLowerCase();
    if (a.includes("allow") || a.includes("permit") || a.includes("pass")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (a.includes("block") || a.includes("reject")) {
      return "bg-red-50 text-red-700 border-red-200";
    }
    if (a.includes("deny") || a.includes("drop")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const toggleSelectAll = () => {
    if (Object.keys(selectedIds).length === filteredEvents.length) {
      setSelectedIds({});
    } else {
      const all: Record<string, boolean> = {};
      filteredEvents.forEach((e) => {
        all[e.event_id] = true;
      });
      setSelectedIds(all);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between h-full group">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">
            Recent Events
          </h3>
          <p className="text-[11px] font-medium text-slate-400 mt-0.5">
            Normalized live log stream with SHA-256 integrity verification
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Filter Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter events..."
              className="pl-8 pr-3 py-1 text-xs rounded-xl bg-slate-50 border border-slate-200/80 focus:outline-none focus:border-orange-500 focus:bg-white text-slate-800 placeholder-slate-400 w-36 sm:w-44 transition-all"
            />
          </div>

          <Link
            href="/explorer"
            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-2.5 px-3 w-8">
                <input
                  type="checkbox"
                  checked={
                    filteredEvents.length > 0 &&
                    Object.keys(selectedIds).length === filteredEvents.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Event ID</th>
              <th className="py-2.5 px-3">Source IP</th>
              <th className="py-2.5 px-3">Destination IP</th>
              <th className="py-2.5 px-2">Protocol</th>
              <th className="py-2.5 px-3">Action</th>
              <th className="py-2.5 px-3">Severity</th>
              <th className="py-2.5 px-2">Format</th>
              <th className="py-2.5 px-3 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`sk-${idx}`} className="animate-pulse">
                  <td className="py-3 px-3"><div className="h-3 w-3 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3"><div className="h-3 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3"><div className="h-3 w-16 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-2"><div className="h-3 w-8 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3"><div className="h-4 w-12 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3"><div className="h-4 w-14 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-2"><div className="h-4 w-10 bg-slate-200 rounded" /></td>
                  <td className="py-3 px-3 text-right"><div className="h-5 w-6 bg-slate-200 rounded ml-auto" /></td>
                </tr>
              ))
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-10 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mb-2" />
                    <h4 className="text-xs font-bold text-slate-700">
                      No events matching criteria
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Ingest logs or adjust filter query to view events.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => (
                <tr
                  key={evt.event_id}
                  onClick={() => onInspectEvent(evt.event_id)}
                  className={`hover:bg-orange-50/20 transition-colors cursor-pointer ${
                    selectedIds[evt.event_id] ? "bg-orange-50/40" : ""
                  }`}
                >
                  <td className="py-3 px-3" onClick={(e) => toggleSelect(evt.event_id, e)}>
                    <input
                      type="checkbox"
                      checked={!!selectedIds[evt.event_id]}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    />
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-sans text-xs whitespace-nowrap">
                    {evt.timestamp
                      ? new Date(evt.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "--"}
                  </td>
                  <td className="py-3 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                    <span className="font-semibold text-slate-800">
                      {evt.event_id.slice(0, 8)}
                    </span>
                    <span className="text-slate-400">...</span>
                  </td>
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                    {evt.source_ip || "--"}
                  </td>
                  <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-medium">
                    {evt.destination_ip || "--"}
                  </td>
                  <td className="py-3 px-2 text-slate-500 uppercase text-[10px] whitespace-nowrap">
                    {evt.protocol || "TCP"}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {evt.action ? (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getActionBadge(
                          evt.action
                        )}`}
                      >
                        {evt.action}
                      </span>
                    ) : (
                      <span className="text-slate-300">--</span>
                    )}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getSeverityBadge(
                        evt.severity
                      )}`}
                    >
                      {evt.severity || "INFO"}
                    </span>
                  </td>
                  <td className="py-3 px-2 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {evt.detected_format}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInspectEvent(evt.event_id);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors inline-flex items-center cursor-pointer"
                      title="Inspect event details"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <Lock className="w-3 h-3 text-emerald-500" />
          <span>Lossless raw logs cryptographically sealed via SHA-256</span>
        </div>
        <span className="font-mono text-slate-500">
          Showing {filteredEvents.length} event{filteredEvents.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}

