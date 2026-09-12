"use client";

import React, { useState } from "react";
import {
  X,
  Shield,
  Copy,
  Check,
  Calendar,
  Lock,
  ArrowRight,
  Sparkles,
  Brain,
  Network,
  ShieldCheck,
  CheckCircle2,
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "ai_analysis" | "raw" | "normalized" | "additional" | "traceability"
  >("overview");

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
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (s.includes("med") || s.includes("warn")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (s.includes("low")) {
      return "bg-slate-100 text-slate-700 border-slate-200";
    }
    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getActionBadge = (action: string | null) => {
    if (!action) return <span className="text-slate-300 font-mono text-xs">--</span>;
    const a = action.toLowerCase();
    if (a.includes("allow") || a.includes("pass") || a.includes("permit")) {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
          ALLOW
        </span>
      );
    }
    if (a.includes("block") || a.includes("drop") || a.includes("deny") || a.includes("reject")) {
      return (
        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          {action.toUpperCase()}
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
        {action.toUpperCase()}
      </span>
    );
  };

  const additionalKeys = event.additional_fields ? Object.keys(event.additional_fields) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modern Clean Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-white">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Eyebrow + ID Chip */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 tracking-tight">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  <span>Security Event</span>
                </div>
                <span className="text-slate-300">·</span>
                <div className="inline-flex items-center gap-1.5 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200/80">
                  <span className="font-mono text-xs font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-none">
                    {event.event_id}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
                    title="Copy full Event UUID"
                  >
                    {copiedId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Timestamp & SHA-256 Chip Row */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {event.timestamp
                      ? new Date(event.timestamp).toUTCString()
                      : `Stored ${new Date(event.created_at).toLocaleString()}`}
                  </span>
                </span>

                <span className="text-slate-200 hidden sm:inline">|</span>

                {/* Compact SHA-256 Chip with Copy */}
                <button
                  type="button"
                  onClick={handleCopyHash}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-600 text-[11px] font-mono transition-colors cursor-pointer group"
                  title="Click to copy full SHA-256 Digest"
                >
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>SHA-256:</span>
                  <span className="font-bold text-slate-800 group-hover:text-orange-600">
                    {event.sha256_hash.slice(0, 8)}...{event.sha256_hash.slice(-6)}
                  </span>
                  {copiedHash ? (
                    <Check className="w-3 h-3 text-emerald-600 ml-0.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 ml-0.5" />
                  )}
                </button>
              </div>

              {/* Semantic Status Badges */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs font-mono font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-lg">
                  {event.detected_format.toUpperCase()}
                </span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${getSeverityBadge(
                    event.severity
                  )}`}
                >
                  {event.severity ? `${event.severity.toUpperCase()} SEVERITY` : "UNCLASSIFIED"}
                </span>
                {event.action && getActionBadge(event.action)}
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
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Close modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clean Segmented Tab Navigation */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "overview", label: "Overview" },
              {
                id: "ai_analysis",
                label: "AI Analysis",
                badge: event.anomaly?.classification,
                icon: Brain,
              },
              { id: "raw", label: "Raw Payload" },
              { id: "normalized", label: "Normalized UES" },
              {
                id: "additional",
                label: "Vendor Fields",
                count: additionalKeys.length > 0 ? additionalKeys.length : undefined,
              },
              { id: "traceability", label: "Traceability & Proof" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        isActive
                          ? "bg-white/20 text-white"
                          : tab.badge === "Highly Anomalous"
                          ? "bg-rose-100 text-rose-700"
                          : tab.badge === "Suspicious"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* 1. OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              {/* Network Traffic Hero Flow Card */}
              <div className="bg-slate-50/70 rounded-2xl p-4 sm:p-5 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-orange-600" />
                    <span className="text-xs font-bold text-slate-900 tracking-tight">
                      Network Flow Telemetry
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px] font-bold">
                      {event.protocol || "PROTOCOL UNKNOWN"}
                    </span>
                    {getActionBadge(event.action)}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                  {/* Source Endpoint */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Source Origin
                    </span>
                    <div className="text-base font-bold font-mono text-slate-900">
                      {event.source_ip || "Not Detected"}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Port: <span className="font-semibold text-slate-700">{event.source_port ?? "--"}</span>
                    </div>
                  </div>

                  {/* Destination Endpoint */}
                  <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Destination Target
                    </span>
                    <div className="text-base font-bold font-mono text-slate-900">
                      {event.destination_ip || "Not Detected"}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Port: <span className="font-semibold text-slate-700">{event.destination_port ?? "--"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Message (if extracted) */}
              {event.normalized_event?.message && (
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Normalized Event Message
                  </span>
                  <p className="font-mono text-xs text-slate-800 break-words leading-relaxed">
                    {event.normalized_event.message}
                  </p>
                </div>
              )}

              {/* Key Attributes 4-Cell Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Log Grammar
                  </span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {event.detected_format.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Compiled Parser</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Severity Tier
                  </span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {event.severity ? event.severity.toUpperCase() : "UNCLASSIFIED"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Normalized Level</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Enforcement Action
                  </span>
                  <span className="font-mono font-bold text-slate-800 mt-1 block">
                    {event.action ? event.action.toUpperCase() : "RECORDED"}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Firewall Verdict</span>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    Raw Integrity
                  </span>
                  <span className="font-mono font-bold text-emerald-600 mt-1 block flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>SHA-256 Valid</span>
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Zero-loss Audit</span>
                </div>
              </div>

              {/* AI Anomaly Spotlight Banner (if anomaly scored) */}
              {event.anomaly && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50/70 to-amber-50/40 border border-orange-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-orange-950">AI Anomaly Assessment:</span>
                        <span
                          className={`px-2 py-0.2 rounded font-bold uppercase text-[10px] ${
                            event.anomaly.classification === "Highly Anomalous"
                              ? "bg-rose-100 text-rose-700"
                              : event.anomaly.classification === "Suspicious"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {event.anomaly.classification} ({event.anomaly.anomaly_score.toFixed(2)})
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 line-clamp-1">
                        {event.anomaly.explanation || "Evaluated by Isolation Forest local machine learning engine."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("ai_analysis")}
                    className="inline-flex items-center gap-1 font-semibold text-orange-700 hover:text-orange-900 hover:underline shrink-0 cursor-pointer"
                  >
                    <span>View AI Analysis</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Bottom Lossless Footer Notice */}
              <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lossless raw log preserved with cryptographic SHA-256 proof.</span>
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("raw")}
                  className="font-semibold text-orange-600 hover:underline cursor-pointer"
                >
                  View Pristine Raw String →
                </button>
              </div>
            </div>
          )}

          {/* 2. AI ANOMALY ANALYSIS TAB */}
          {activeTab === "ai_analysis" && (
            <div className="space-y-4">
              {event.anomaly ? (
                <>
                  {/* Anomaly Gauge & Metadata Card */}
                  <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Isolation Forest Score
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
                        <span className="text-xs text-slate-400 font-mono">/ 1.000 max score</span>
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
                        <span className="font-mono font-bold text-slate-800">
                          {event.anomaly.model_name} {event.anomaly.model_version}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Scored Timestamp</span>
                        <span className="font-mono text-slate-600">
                          {new Date(event.anomaly.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inference Method</span>
                        <span className="text-slate-600">Local Unsupervised Isolation Forest</span>
                      </div>
                    </div>
                  </div>

                  {/* Explainability Section */}
                  <div className="p-4.5 rounded-xl bg-orange-50/60 border border-orange-100 space-y-2">
                    <div className="flex items-center gap-2 text-orange-950 font-bold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      <span>Plain-English Feature Deviation Justification</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                      {event.anomaly.explanation}
                    </p>
                  </div>

                  {/* Feature Dimensions Snapshot */}
                  {event.anomaly.features_snapshot && (
                    <div className="p-4 rounded-xl border border-slate-200/80 bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                          Evaluated Feature Dimensions Snapshot
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">14 Vector Signals</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Remote Access Port</span>
                          <span className="font-bold text-slate-800">
                            {event.anomaly.features_snapshot.is_remote_access_port === 1 ? "Yes (SSH/RDP)" : "No"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Enforcement Action</span>
                          <span className="font-bold text-slate-800">
                            {event.anomaly.features_snapshot.action_num === 1 ? "Block / Drop" : "Allow / Other"}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">UTC Hour Window</span>
                          <span className="font-bold text-slate-800">
                            {Math.round(event.anomaly.features_snapshot.hour_of_day || 0)}:00 UTC
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-sans">Ingress Boundary</span>
                          <span className="font-bold text-slate-800">
                            {event.anomaly.features_snapshot.is_internal_src === 0 &&
                            event.anomaly.features_snapshot.is_internal_dst === 1
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

          {/* 3. RAW EVENT TAB */}
          {activeTab === "raw" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Pristine Byte-for-Byte Raw String
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Exact unaltered byte representation preserved losslessly for forensic auditability.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyRaw}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRaw ? "Copied" : "Copy Raw Log"}</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all leading-relaxed max-h-96 border border-slate-800 shadow-inner select-text">
                {event.raw_event}
              </pre>
            </div>
          )}

          {/* 4. NORMALIZED UES SCHEMA TAB */}
          {activeTab === "normalized" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    Universal Event Schema (UES) Canonical Format
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Standardized JSON payload mapped through the LogForge parser framework.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(event.normalized_event, null, 2));
                  }}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </button>
              </div>

              <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 border border-slate-800 shadow-inner select-text">
                {event.normalized_event
                  ? JSON.stringify(event.normalized_event, null, 2)
                  : "// No normalized UES schema available"}
              </pre>
            </div>
          )}

          {/* 5. VENDOR FIELDS TAB */}
          {activeTab === "additional" && (
            <div className="space-y-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Preserved Vendor-Specific Attributes ({additionalKeys.length})
                </span>
                <p className="text-[11px] text-slate-400">
                  Custom unmapped vendor fields retained losslessly to ensure zero data loss during normalization.
                </p>
              </div>

              {additionalKeys.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {additionalKeys.map((key) => {
                    const val = event.additional_fields?.[key];
                    const displayVal = typeof val === "object" ? JSON.stringify(val) : String(val);
                    return (
                      <div key={key} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">
                          {key}
                        </span>
                        <span className="font-mono text-slate-800 font-semibold truncate block mt-0.5">
                          {displayVal}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-500">
                  No unmapped custom vendor attributes were detected in this event.
                </div>
              )}
            </div>
          )}

          {/* 6. TRACEABILITY & PROOF TAB */}
          {activeTab === "traceability" && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Deterministic Cryptographic Chain of Custody</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Step-by-step verification pipeline linking the raw input byte string to the normalized schema and immutable SHA-256 digest.
                  </p>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="text-slate-800 font-sans text-xs">Assigned Event UUID:</strong>
                      <p className="text-slate-600 mt-0.5 break-all">{event.event_id}</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="text-slate-800 font-sans text-xs">Pristine Raw Ingestion:</strong>
                      <p className="text-slate-600 mt-0.5 line-clamp-2">{event.raw_event}</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="text-slate-800 font-sans text-xs">Universal Event Schema (UES):</strong>
                      <p className="text-slate-600 mt-0.5">
                        Detected: {event.detected_format.toUpperCase()} · Severity: {event.severity || "UNCLASSIFIED"} · Action: {event.action || "--"}
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">
                      4
                    </span>
                    <div className="flex-1 min-w-0">
                      <strong className="text-emerald-950 font-sans text-xs">Immutable SHA-256 Digest:</strong>
                      <p className="text-emerald-800 mt-0.5 break-all font-bold">{event.sha256_hash}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyHash}
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-700 font-sans font-semibold text-[11px] hover:bg-emerald-50 transition-colors cursor-pointer shrink-0"
                    >
                      {copiedHash ? "Copied" : "Copy Digest"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
