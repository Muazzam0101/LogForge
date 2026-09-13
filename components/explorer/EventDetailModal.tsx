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
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Layers,
  Link2,
} from "lucide-react";
import { StoredEventDetail, EventVerificationResult } from "@/lib/api/types";
import { ulpfApi } from "@/lib/api/ulpf";

interface EventDetailModalProps {
  event: StoredEventDetail | null;
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "ai_analysis" | "raw" | "normalized" | "additional" | "traceability" | "integrity"
  >("overview");
  const [verificationResult, setVerificationResult] = useState<EventVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!event) return;
    setIsVerifying(true);
    setVerificationError(null);
    try {
      const res = await ulpfApi.verifyEventIntegrity(event.event_id);
      setVerificationResult(res);
    } catch (err: any) {
      setVerificationError(err.message || "Failed to verify event integrity.");
    } finally {
      setIsVerifying(false);
    }
  };


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
              { id: "integrity", label: "Integrity & Blockchain", icon: ShieldCheck },
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

          {/* 7. INTEGRITY & BLOCKCHAIN TAB */}
          {activeTab === "integrity" && (
            <div className="space-y-4">
              {/* Header Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-orange-600" />
                    <h4 className="font-bold text-slate-900 text-sm">
                      Cryptographic Proof & Blockchain Verification
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Server-side re-computation of SHA-256 over exact raw bytes and blockchain anchor verification.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
                  <span>{isVerifying ? "Verifying On Server..." : "Verify Integrity"}</span>
                </button>
              </div>

              {/* Tamper Alert Warning Banner (If TAMPERED) */}
              {verificationResult && verificationResult.integrity === "TAMPERED" && (
                <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 shadow-sm space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 text-rose-900 font-extrabold text-sm uppercase tracking-wide">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>TAMPER DETECTED: Cryptographic Hash Mismatch</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    The current event raw byte hash does not match the original recorded digest. The payload has been modified or corrupted after ingestion.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 bg-white/90 rounded-xl border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                        Original Stored Hash (Ingestion Baseline)
                      </span>
                      <p className="font-mono text-xs text-slate-800 font-bold break-all mt-1">
                        {verificationResult.stored_hash || event.sha256_hash}
                      </p>
                    </div>

                    <div className="p-3 bg-rose-100/70 rounded-xl border border-rose-300">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                        Calculated Hash (Current Raw Bytes)
                      </span>
                      <p className="font-mono text-xs text-rose-900 font-bold break-all mt-1">
                        {verificationResult.calculated_hash}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Valid Status Card (If VALID) */}
              {verificationResult && verificationResult.integrity === "VALID" && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider block">
                        Cryptographically Valid & Pristine
                      </span>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        {verificationResult.details || "Recalculated SHA-256 matches the stored baseline digest exactly."}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0">
                    MATCH CONFIRMED
                  </span>
                </div>
              )}

              {/* Unverified Initial Notice */}
              {!verificationResult && (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-900">
                    Click <strong>Verify Integrity</strong> above to initiate real-time server-side cryptographic verification over the exact raw byte stream.
                  </p>
                </div>
              )}

              {/* Structured Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {/* Event ID */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Event UUIDv4
                  </span>
                  <p className="font-mono text-slate-800 font-semibold truncate text-[11px]">
                    {event.event_id}
                  </p>
                </div>

                {/* Hash Algorithm */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Hash Algorithm
                  </span>
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{verificationResult?.hash_algorithm || "SHA-256"}</span>
                  </div>
                </div>

                {/* Integrity Status */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Integrity Status
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] uppercase ${
                      verificationResult?.integrity === "VALID"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : verificationResult?.integrity === "TAMPERED"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-700 border border-slate-200"
                    }`}
                  >
                    {verificationResult?.integrity || "UNVERIFIED"}
                  </span>
                </div>

                {/* Blockchain Status */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Blockchain Status
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] uppercase ${
                      verificationResult?.blockchain_anchored || verificationResult?.blockchain_status === "CONFIRMED"
                        ? "bg-purple-50 text-purple-700 border border-purple-200"
                        : verificationResult?.blockchain_status === "DISABLED"
                        ? "bg-slate-100 text-slate-500 border border-slate-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {verificationResult?.blockchain_status || "PENDING"}
                  </span>
                </div>
              </div>

              {/* SHA-256 Digest Full Card */}
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    Recorded SHA-256 Digest
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedHash ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedHash ? "Copied" : "Copy Digest"}</span>
                  </button>
                </div>
                <p className="font-mono text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 break-all select-all font-bold">
                  {event.sha256_hash}
                </p>
              </div>

              {/* Blockchain Anchoring & Merkle Batch Details */}
              <div className="p-4.5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-3">
                <div className="flex items-center gap-2 text-purple-950 font-bold text-xs uppercase tracking-wider">
                  <Layers className="w-4 h-4 text-purple-600" />
                  <span>On-Chain Merkle Tree Batch Anchor</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  To achieve massive throughput without exposing sensitive raw logs, events are aggregated into binary Merkle trees. Only the 32-byte cryptographic root hash is anchored on the smart contract.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono pt-1">
                  <div className="p-2.5 bg-white rounded-xl border border-purple-100/80">
                    <span className="text-[10px] text-slate-400 block font-sans">Batch UUID</span>
                    <span className="font-bold text-slate-800 break-all text-[11px]">
                      {verificationResult?.batch_id || "Unbatched (Awaiting Next Merkle Cycle)"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-purple-100/80">
                    <span className="text-[10px] text-slate-400 block font-sans">Batch Merkle Root Hash</span>
                    <span className="font-bold text-purple-900 break-all text-[11px]">
                      {verificationResult?.root_hash || "Pending Batch Anchor"}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-purple-100/80 sm:col-span-2">
                    <span className="text-[10px] text-slate-400 block font-sans">Blockchain Transaction Hash</span>
                    <span className="font-bold text-slate-800 break-all text-[11px]">
                      {verificationResult?.transaction_hash || "Awaiting On-Chain Anchor"}
                    </span>
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
