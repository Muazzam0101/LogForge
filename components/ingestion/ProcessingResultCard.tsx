"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  Hash,
  Fingerprint,
  Layers,
  ArrowRight,
  Terminal,
  Clock,
  Code2,
  Sliders,
  Server,
  Network,
  AlertCircle,
} from "lucide-react";
import { ProcessingResult } from "@/lib/api/types";

interface ProcessingResultCardProps {
  result: ProcessingResult;
}

export function ProcessingResultCard({ result }: ProcessingResultCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"visual" | "json">("visual");

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const norm = result.normalized_event;
  const meta = result.processing_metadata;
  const additionalKeys = norm?.additional_fields ? Object.keys(norm.additional_fields) : [];

  // Severity color badge helper
  const getSeverityBadge = (sev?: string | null) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "high":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "medium":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "informational":
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  // Action color badge helper
  const getActionBadge = (action?: string | null) => {
    switch (action?.toLowerCase()) {
      case "allow":
      case "permit":
      case "accept":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "block":
      case "drop":
      case "deny":
      case "reject":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-purple-50 text-purple-700 border-purple-200";
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-7 shadow-xs space-y-6">
      {/* Top Banner: Status, Format, Latency & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Pill */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              result.status === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            {result.status === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            )}
            <span>{result.status === "success" ? "Success" : "Failed / Malformed"}</span>
          </span>

          {/* Format Detected Pill */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
            <span>Format:</span>
            <span className="font-extrabold">{result.format_detected || "UNKNOWN"}</span>
          </span>

          {/* Parser Selected */}
          {norm?.parser && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
              <Cpu className="w-3 h-3 text-purple-500" />
              <span>{norm.parser.parser_name}</span>
            </span>
          )}

          {/* Processing Latency */}
          {meta?.processing_time_ms !== undefined && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-slate-50 text-slate-600 border border-slate-200">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>{meta.processing_time_ms} ms</span>
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("visual")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === "visual"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Structured View
          </button>
          <button
            type="button"
            onClick={() => setViewMode("json")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              viewMode === "json"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Raw JSON Output
          </button>
        </div>
      </div>

      {/* Parsing / Validation Error Banner if status is failed */}
      {result.status === "failed" && result.error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-200/80 text-rose-900">
                {result.error.code || "FAILED"}
              </span>
              <span className="font-semibold">{result.error.message}</span>
            </div>
            <p className="text-[11px] text-rose-600">
              The log format was not recognized or parsing failed. Original bytes and SHA-256 digest are still preserved losslessly below.
            </p>
          </div>
        </div>
      )}

      {/* Traceability & Integrity Pipeline Card (SIH NTRO Core Requirement) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50/50 via-indigo-50/30 to-blue-50/40 border border-purple-100/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Cryptographic Traceability Pipeline
            </h4>
          </div>
          <span className="text-[11px] font-medium text-purple-700">
            Air-gapped Audit Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Unique Event ID */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                <Fingerprint className="w-3 h-3 text-purple-500" />
                <span>Unique Event ID (UUIDv4)</span>
              </div>
              <p className="font-mono text-xs font-bold text-slate-900 truncate mt-0.5">
                {result.event_id}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(result.event_id, "event_id")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors shrink-0 cursor-pointer"
              title="Copy Event ID"
            >
              {copiedField === "event_id" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Cryptographic SHA-256 Digest */}
          <div className="p-3 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 shadow-xs">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                <Hash className="w-3 h-3 text-indigo-500" />
                <span>Raw Event SHA-256 Digest</span>
              </div>
              <p className="font-mono text-xs font-bold text-slate-900 truncate mt-0.5">
                {result.raw_event_hash}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(result.raw_event_hash, "raw_hash")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors shrink-0 cursor-pointer"
              title="Copy SHA-256 Hash"
            >
              {copiedField === "raw_hash" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {viewMode === "visual" ? (
        <>
          {/* Universal Event Schema Canonical Breakdown */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Canonical Entities (Universal Event Schema)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Source Endpoint */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <Network className="w-3.5 h-3.5 text-purple-600" />
                  <span>Source Endpoint</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">IP Address:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {norm?.source?.ip || "--"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Port:</span>
                    <span className="font-mono text-slate-700">
                      {norm?.source?.port ?? "--"}
                    </span>
                  </div>
                  {norm?.source?.user && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">User:</span>
                      <span className="font-semibold text-slate-700">
                        {norm.source.user}
                      </span>
                    </div>
                  )}
                  {norm?.source?.hostname && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Host:</span>
                      <span className="text-slate-700 truncate max-w-[140px]">
                        {norm.source.hostname}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Endpoint */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <Network className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Destination Endpoint</span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">IP Address:</span>
                    <span className="font-mono font-bold text-slate-800">
                      {norm?.destination?.ip || "--"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Port:</span>
                    <span className="font-mono text-slate-700">
                      {norm?.destination?.port ?? "--"}
                    </span>
                  </div>
                  {norm?.destination?.user && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">User:</span>
                      <span className="font-semibold text-slate-700">
                        {norm.destination.user}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Security & Action Verdict */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 sm:col-span-2 lg:col-span-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Security & Action</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Verdict Action:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${getActionBadge(
                        norm?.action
                      )}`}
                    >
                      {norm?.action || "UNKNOWN"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Severity:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border ${getSeverityBadge(
                        norm?.severity
                      )}`}
                    >
                      {norm?.severity || "INFO"}
                      {norm?.severity_code != null && ` (${norm.severity_code})`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Protocol:</span>
                    <span className="font-mono font-bold uppercase text-slate-700">
                      {norm?.network?.protocol || "--"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Device & Summary row if present */}
            {(norm?.device || norm?.message) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
                {norm?.device && (
                  <div className="p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/70 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold mb-1">
                      <Server className="w-3 h-3 text-slate-400" />
                      <span>Originating Device:</span>
                    </div>
                    <p className="font-semibold text-slate-800">
                      {[norm.device.vendor, norm.device.product, norm.device.hostname]
                        .filter(Boolean)
                        .join(" · ") || "--"}
                    </p>
                  </div>
                )}

                {norm?.message && (
                  <div className="p-3.5 rounded-2xl bg-slate-50/50 border border-slate-200/70 text-xs">
                    <span className="text-slate-500 font-bold block mb-1">
                      Extracted Message:
                    </span>
                    <p className="text-slate-700 truncate" title={norm.message}>
                      {norm.message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lossless Preservation: Preserved Custom Vendor Fields */}
          {additionalKeys.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Unmapped Vendor Attributes (Lossless Container)
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  {additionalKeys.length} Attributes Preserved
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {additionalKeys.map((key) => {
                  const val = norm?.additional_fields[key];
                  const displayVal = typeof val === "object" ? JSON.stringify(val) : String(val);
                  return (
                    <div
                      key={key}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs"
                    >
                      <span className="text-[10px] font-bold text-slate-400 uppercase block truncate">
                        {key}
                      </span>
                      <span className="font-mono text-slate-800 font-medium truncate block mt-0.5">
                        {displayVal}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        /* JSON Tree View */
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Complete Normalized Event JSON
            </h4>
            <button
              onClick={() =>
                copyToClipboard(
                  JSON.stringify(result.normalized_event, null, 2),
                  "normalized_json"
                )
              }
              className="text-xs text-purple-600 hover:text-purple-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              {copiedField === "normalized_json" ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-96 leading-relaxed">
            {JSON.stringify(result.normalized_event, null, 2)}
          </pre>
        </div>
      )}

      {/* Pristine Raw Event Section (Verbatim Byte Preservation) */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Exact Pristine Raw Event (Verbatim Byte Preservation)
            </h4>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(result.raw_event, "raw_event")}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            {copiedField === "raw_event" ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Raw Log</span>
              </>
            )}
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs overflow-x-auto leading-relaxed selection:bg-purple-900 selection:text-white">
          <code>{result.raw_event}</code>
        </div>
      </div>
    </div>
  );
}
