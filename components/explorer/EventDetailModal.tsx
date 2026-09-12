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
  GitCommit,
  Sparkles,
  Brain,
  AlertTriangle,
  AlertCircle,
  Cpu,
} from "lucide-react";
import { StoredEventDetail } from "@/lib/api/types";

interface EventDetailModalProps {
  event: StoredEventDetail | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "ai_analysis" | "raw" | "normalized" | "additional" | "traceability">("overview");


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

  const handleCopyId = () => {
    navigator.clipboard.writeText(event.event_id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
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
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/60">
          <div className="space-y-1.5 flex-1 min-w-0">
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
              {event.protocol && (
                <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg uppercase">
                  {event.protocol}
                </span>
              )}
              {event.anomaly && (
                <span
                  className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border flex items-center gap-1.5 ${
                    event.anomaly.classification === "Highly Anomalous"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : event.anomaly.classification === "Suspicious"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  <Brain className="w-3 h-3" />
                  <span>
                    Score: {event.anomaly.anomaly_score.toFixed(2)} ({event.anomaly.classification})
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight font-mono truncate">
                {event.event_id}
              </h2>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                title="Copy Event ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {event.timestamp ? new Date(event.timestamp).toUTCString() : "No timestamp extracted"}
              </span>
              <span>·</span>
              <span>Stored: {new Date(event.created_at).toLocaleString()}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cryptographic SHA-256 Hash Strip (Requirement 7) */}
        <div className="px-6 py-2.5 bg-slate-900 text-slate-300 border-y border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0">
              SHA-256 Raw Integrity Digest:
            </span>
            <span className="font-mono text-xs text-emerald-300 truncate" title={event.sha256_hash}>
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

        {/* Traceability Relationship Ribbon (Requirement 8) */}
        <div className="px-6 py-2 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between text-xs overflow-x-auto">
          <div className="flex items-center gap-2 font-mono text-[11px] text-purple-900 shrink-0">
            <span className="font-bold text-purple-700">Audit Traceability:</span>
            <span className="bg-white px-2 py-0.5 rounded border border-purple-200">Event ID</span>
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <span className="bg-white px-2 py-0.5 rounded border border-purple-200">Raw Event</span>
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <span className="bg-white px-2 py-0.5 rounded border border-purple-200">Normalized Event (UES)</span>
            <ArrowRight className="w-3 h-3 text-purple-400" />
            <span className="bg-white px-2 py-0.5 rounded border border-purple-200">SHA-256</span>
          </div>
          <span className="text-[10px] text-purple-600 font-medium pl-3 hidden md:inline">
            Deterministic cryptographic derivation
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Event Information" },
            {
              id: "ai_analysis",
              label: "AI Anomaly Analysis",
              badge: event.anomaly?.classification,
            },
            { id: "raw", label: "Raw Event (Pristine)" },
            { id: "normalized", label: "Normalized UES Schema" },
            { id: "additional", label: "Additional Vendor Fields" },
            { id: "traceability", label: "Traceability & Integrity" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-t-xl transition-colors cursor-pointer border-b-2 shrink-0 flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "border-purple-600 text-purple-700 bg-purple-50/50"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.id === "ai_analysis" && <Brain className="w-3.5 h-3.5 text-purple-600" />}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    tab.badge === "Highly Anomalous"
                      ? "bg-rose-100 text-rose-700"
                      : tab.badge === "Suspicious"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>


        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 1. Event Information Tab (Requirement 7) */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Core Attributes Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Detected Format</span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {event.detected_format.toUpperCase()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Severity</span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {event.severity ? event.severity.toUpperCase() : "UNCLASSIFIED"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Action</span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {event.action ? event.action.toUpperCase() : "--"}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">Protocol</span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {event.protocol ? event.protocol.toUpperCase() : "--"}
                  </span>
                </div>
              </div>

              {/* Endpoints Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Source Endpoint */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Source Endpoint
                  </span>
                  <div className="space-y-1">
                    <div className="text-sm font-mono font-bold text-slate-800">
                      IP: {event.source_ip || "Not Detected"}
                    </div>
                    <div className="text-xs font-mono text-slate-600">
                      Port: {event.source_port !== null && event.source_port !== undefined ? event.source_port : "--"}
                    </div>
                  </div>
                </div>

                {/* Destination Endpoint */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Destination Endpoint
                  </span>
                  <div className="space-y-1">
                    <div className="text-sm font-mono font-bold text-slate-800">
                      IP: {event.destination_ip || "Not Detected"}
                    </div>
                    <div className="text-xs font-mono text-slate-600">
                      Port: {event.destination_port !== null && event.destination_port !== undefined ? event.destination_port : "--"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Normalized Message if present */}
              {event.normalized_event?.message && (
                <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-xs text-slate-700">
                  <span className="font-bold text-purple-900 block mb-1">Normalized Event Message:</span>
                  <p className="font-mono text-slate-800 break-words">{event.normalized_event.message}</p>
                </div>
              )}

              {/* Lossless Guarantee Banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-2.5 text-xs text-emerald-800">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Lossless Preservation:</strong> Original raw log string is cryptographically locked with SHA-256 and stored separately from the normalized schema.
                </span>
              </div>
            </div>
          )}

          {/* AI Anomaly Analysis Tab */}
          {activeTab === "ai_analysis" && (
            <div className="space-y-5">
              {event.anomaly ? (
                <>
                  {/* Top Anomaly Meter Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-purple-50/30 border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Anomaly Score
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            event.anomaly.classification === "Highly Anomalous"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : event.anomaly.classification === "Suspicious"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {event.anomaly.classification}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight">
                          {event.anomaly.anomaly_score.toFixed(3)}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">/ 1.000</span>
                      </div>

                      {/* Score Gradient Gauge Bar */}
                      <div className="space-y-1 pt-1 max-w-md">
                        <div className="relative h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                          <div className="w-[40%] bg-emerald-400" title="Normal (0.00 - 0.39)" />
                          <div className="w-[30%] bg-amber-400" title="Suspicious (0.40 - 0.69)" />
                          <div className="w-[30%] bg-rose-500" title="Highly Anomalous (0.70 - 1.00)" />
                        </div>
                        {/* Pointer indicator */}
                        <div className="relative w-full h-3">
                          <div
                            className="absolute top-0 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-slate-800"
                            style={{
                              left: `${Math.max(2, Math.min(98, event.anomaly.anomaly_score * 100))}%`,
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                          <span>0.00 (Normal)</span>
                          <span>0.40 (Suspicious)</span>
                          <span>0.70 (Outlier)</span>
                          <span>1.00</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-6 space-y-2 text-xs shrink-0">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Model Engine</span>
                        <span className="font-mono font-bold text-slate-800">{event.anomaly.model_name} {event.anomaly.model_version}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Scored Timestamp</span>
                        <span className="font-mono text-slate-600">{new Date(event.anomaly.created_at).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inference Method</span>
                        <span className="text-slate-600">Local Unsupervised Isolation Forest</span>
                      </div>
                    </div>
                  </div>

                  {/* Explainability Section */}
                  <div className="p-4.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
                    <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>Plain-English Feature Deviation Justification</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                      {event.anomaly.explanation}
                    </p>
                  </div>

                  {/* Feature Dimensions Snapshot */}
                  {event.anomaly.features_snapshot && (
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                          Evaluated Feature Dimensions Snapshot
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">14 Vector Signals</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Remote Access Port</span>
                          <span className="font-bold text-slate-800">
                            {event.anomaly.features_snapshot.is_remote_access_port === 1 ? "Yes (SSH/RDP)" : "No"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Enforcement Action</span>
                          <span className="font-bold text-slate-800">
                            {event.anomaly.features_snapshot.action_num === 1 ? "Block / Drop" : event.anomaly.features_snapshot.action_num === 0 ? "Allow" : "Other"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">UTC Hour Window</span>
                          <span className="font-bold text-slate-800">
                            {Math.round(event.anomaly.features_snapshot.hour_of_day || 0)}:00 UTC
                          </span>
                        </div>
                        <div className="p-2.5 bg-white rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Ingress Boundary</span>
                          <span className="font-bold text-slate-800">
                            {event.anomaly.features_snapshot.is_internal_src === 0 && event.anomaly.features_snapshot.is_internal_dst === 1
                              ? "External Inbound"
                              : event.anomaly.features_snapshot.is_internal_src === 1
                              ? "Internal Net"
                              : "External"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                    <Brain className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Anomaly Score Recorded</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    This event was ingested before the Isolation Forest model was calibrated. You can trigger on-demand model retraining from the main Dashboard to score historical events stored in MySQL.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 2. Raw Event Tab (Requirement 9: strictly as text, safe against HTML/XSS/Unicode) */}
          {activeTab === "raw" && (

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-700 block">
                    Exact Byte-for-Byte Original Raw Log
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Pristine unaltered raw input string preserved for regulatory auditing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRaw ? "Copied" : "Copy Raw"}</span>
                </button>
              </div>

              {/* Safe rendering strictly in <pre> as text */}
              <pre className="p-4 rounded-2xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-96 border border-slate-800 shadow-inner select-text">
                {event.raw_event}
              </pre>
            </div>
          )}

          {/* 3. Normalized UES Schema Tab */}
          {activeTab === "normalized" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Universal Event Schema (UES) Standardized Representation
                </span>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 border border-slate-800 shadow-inner select-text">
                {event.normalized_event
                  ? JSON.stringify(event.normalized_event, null, 2)
                  : "// No normalized UES schema available"}
              </pre>
            </div>
          )}

          {/* 4. Additional Vendor Fields Tab */}
          {activeTab === "additional" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Unmapped Vendor Fields (Zero Field Loss Guarantee)
                </span>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 border border-slate-800 shadow-inner select-text">
                {event.additional_fields && Object.keys(event.additional_fields).length > 0
                  ? JSON.stringify(event.additional_fields, null, 2)
                  : "// No unmapped vendor fields present for this event"}
              </pre>
            </div>
          )}

          {/* 5. Traceability & Integrity Tab */}
          {activeTab === "traceability" && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Deterministic Verification Pipeline</h4>
                <div className="space-y-3 font-mono">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                    <div>
                      <strong className="text-slate-800">Assigned Event ID:</strong>
                      <p className="text-slate-600 mt-0.5">{event.event_id}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                    <div>
                      <strong className="text-slate-800">Raw Payload Ingested:</strong>
                      <p className="text-slate-600 mt-0.5">{event.raw_event.slice(0, 80)}...</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                    <div>
                      <strong className="text-slate-800">Normalized into UES:</strong>
                      <p className="text-slate-600 mt-0.5">Format: {event.detected_format} | Severity: {event.severity || "UNCLASSIFIED"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                    <div>
                      <strong className="text-slate-800">Cryptographic SHA-256 Digest:</strong>
                      <p className="text-emerald-700 mt-0.5 break-all">{event.sha256_hash}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-800">
                This verification trail certifies that the normalized event displayed was generated directly from the preserved raw event payload, with integrity validated by the immutable SHA-256 digest.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
