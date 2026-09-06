"use client";

import React, { useState } from "react";
import {
  X,
  Shield,
  Copy,
  Check,
  Calendar,
  Layers,
  FileCode2,
  Lock,
  ArrowRight,
  Server,
  Activity,
} from "lucide-react";
import { StoredEventDetail } from "@/lib/api/types";

interface EventDetailModalProps {
  event: StoredEventDetail | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "raw" | "normalized" | "additional">("overview");

  if (!event) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(event.sha256_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(event.raw_event);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-lg">
                {event.detected_format.toUpperCase()}
              </span>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${getSeverityBadge(
                  event.severity
                )}`}
              >
                {event.severity || "UNCLASSIFIED"}
              </span>
              {event.action && (
                <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg uppercase">
                  {event.action}
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-mono break-all">
              {event.event_id}
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {event.timestamp ? new Date(event.timestamp).toUTCString() : "No event timestamp"}
              </span>
              <span>·</span>
              <span>Stored: {new Date(event.created_at).toLocaleString()}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cryptographic SHA-256 Hash Strip */}
        <div className="px-6 py-2.5 bg-slate-900 text-slate-300 border-y border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
              SHA-256 Digest:
            </span>
            <span className="font-mono text-xs text-emerald-300 truncate">
              {event.sha256_hash}
            </span>
          </div>
          <button
            onClick={handleCopyHash}
            className="text-[11px] font-medium text-slate-300 hover:text-white px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedHash ? "Copied" : "Copy Hash"}</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2">
          {[
            { id: "overview", label: "Canonical Overview" },
            { id: "raw", label: "Exact Raw Event" },
            { id: "normalized", label: "Normalized UES Schema" },
            { id: "additional", label: "Additional Vendor Fields" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? "border-purple-600 text-purple-700 bg-purple-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 1. Canonical Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Source Endpoint */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Source Endpoint
                  </span>
                  <div className="mt-2 text-sm font-mono font-bold text-slate-800">
                    {event.source_ip || "Not Detected"}
                    {event.source_port ? `:${event.source_port}` : ""}
                  </div>
                  <span className="text-xs text-slate-400">
                    Protocol: {event.protocol ? event.protocol.toUpperCase() : "--"}
                  </span>
                </div>

                {/* Destination Endpoint */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Destination Endpoint
                  </span>
                  <div className="mt-2 text-sm font-mono font-bold text-slate-800">
                    {event.destination_ip || "Not Detected"}
                    {event.destination_port ? `:${event.destination_port}` : ""}
                  </div>
                  <span className="text-xs text-slate-400">
                    Action: {event.action ? event.action.toUpperCase() : "--"}
                  </span>
                </div>
              </div>

              {/* Message / Details if present */}
              {event.normalized_event?.message && (
                <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-xs text-slate-700">
                  <span className="font-bold text-purple-900 block mb-1">Normalized Event Message:</span>
                  <p className="font-mono text-slate-800">{event.normalized_event.message}</p>
                </div>
              )}

              {/* Lossless Guarantee Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-800">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Lossless Preservation:</strong> The original raw event is cryptographically verified against SHA-256 and stored separately from the normalized schema.
                </span>
              </div>
            </div>
          )}

          {/* 2. Exact Raw Event Tab (Safely rendered as text in <pre>, zero dangerouslySetInnerHTML) */}
          {activeTab === "raw" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  Exact Byte-for-Byte Original Payload
                </span>
                <button
                  onClick={handleCopyRaw}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRaw ? "Copied" : "Copy Raw"}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-80 border border-slate-800 shadow-inner">
                {event.raw_event}
              </pre>
            </div>
          )}

          {/* 3. Normalized UES Schema Tab */}
          {activeTab === "normalized" && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600">
                Universal Event Schema (UES) JSON
              </span>
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 border border-slate-800 shadow-inner">
                {event.normalized_event
                  ? JSON.stringify(event.normalized_event, null, 2)
                  : "// No normalized schema generated"}
              </pre>
            </div>
          )}

          {/* 4. Additional Vendor Fields Tab */}
          {activeTab === "additional" && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600">
                Unmapped Vendor Attributes (Zero Field Drop)
              </span>
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80 border border-slate-800 shadow-inner">
                {event.additional_fields && Object.keys(event.additional_fields).length > 0
                  ? JSON.stringify(event.additional_fields, null, 2)
                  : "// No additional unmapped vendor fields"}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
