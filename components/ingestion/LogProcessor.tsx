"use client";

import React, { useState } from "react";
import {
  Play,
  RotateCcw,
  FileCode2,
  Shield,
  UploadCloud,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { ulpfApi, UlpfApiError } from "@/lib/api/ulpf";
import { BatchProcessResponse, ProcessingResult } from "@/lib/api/types";
import { useModals } from "@/components/context/ModalContext";
import { extractLogsFromText } from "@/lib/utils/logExtractor";
import { validateLogFile, validateLogText } from "@/lib/utils/fileValidator";

interface LogProcessorProps {
  onProcessSuccess: (result: ProcessingResult) => void;
  onBatchSuccess?: (batchResult: BatchProcessResponse) => void;
  onProcessError: (error: UlpfApiError) => void;
  onReset: () => void;
  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;
}

// Authentic realistic sample presets (Zero fake operational dashboard metrics, just test log inputs)
const SAMPLE_PRESETS = [
  {
    label: "JSON Cloud Security",
    hint: "aws_cloudwatch",
    log: '{"timestamp": "2026-09-06T10:15:30Z", "src_ip": "10.0.0.15", "dst_ip": "192.168.1.1", "src_port": 51234, "dst_port": 443, "protocol": "TCP", "action": "ALLOW", "severity": "high", "organization": "NTRO", "threat_intel_score": 92}',
  },
  {
    label: "ArcSight CEF Firewall",
    hint: "checkpoint_fw",
    log: "CEF:0|CheckPoint|VPN-1 & FireWall-1|CheckPoint|drop|Drop packet|High|src=198.51.100.25 dst=203.0.113.50 spt=49152 dpt=22 proto=tcp act=drop suser=admin cn1=984321 cs1=Policy_Rule_10",
  },
  {
    label: "Syslog RFC 5424 (Cisco)",
    hint: "cisco_asa",
    log: "<165>1 2026-09-06T10:14:00.000Z border-gw.ntro.in cisco-asa 12345 ID47 - %ASA-4-106023: Deny tcp src 10.10.10.5:4432 dst 172.16.0.2:80 by access-group OUTSIDE_IN",
  },
];

export function LogProcessor({
  onProcessSuccess,
  onBatchSuccess,
  onProcessError,
  onReset,
  isProcessing,
  setIsProcessing,
}: LogProcessorProps) {
  const { stagedLogContent, setStagedLogContent } = useModals();
  const [rawLog, setRawLog] = useState("");
  const [sourceHint, setSourceHint] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Sync log content staged from the upload modal or direct file drop
  React.useEffect(() => {
    if (stagedLogContent) {
      setRawLog(stagedLogContent.raw_log);
      setValidationError(null);
      if (stagedLogContent.source_hint) {
        setSourceHint(stagedLogContent.source_hint);
      }
      setStagedLogContent(null);
    }
  }, [stagedLogContent, setStagedLogContent]);

  const extractedInfo = React.useMemo(() => {
    return extractLogsFromText(rawLog);
  }, [rawLog]);

  const handleProcess = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!rawLog.trim() || isProcessing) return;

    // Validate payload against binary / non-log data
    const textValidation = validateLogText(rawLog);
    if (!textValidation.valid) {
      setValidationError(textValidation.error || "Invalid input payload.");
      return;
    }

    if (extractedInfo.logs.length === 0) {
      setValidationError(
        "No valid log entries recognized. The input appears to be arbitrary plain text or recovery codes. LogForge accepts JSON, Syslog (RFC 5424/3164), and ArcSight CEF."
      );
      return;
    }

    setValidationError(null);

    setIsProcessing(true);
    try {
      const hint = sourceHint.trim() || undefined;

      if (extractedInfo.logs.length > 1 && onBatchSuccess) {
        // Multi-line / stream batch processing
        const batchResponse = await ulpfApi.processBatch({
          raw_logs: extractedInfo.logs.slice(0, 500),
          source_hint: hint,
        });
        onBatchSuccess(batchResponse);
      } else {
        // Single log line processing
        const singlePayload = extractedInfo.logs[0] || rawLog.trim();
        const result = await ulpfApi.processLog({
          raw_log: singlePayload,
          source_hint: hint,
        });
        onProcessSuccess(result);
      }
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        onProcessError(err);
      } else {
        onProcessError(
          new UlpfApiError(
            "An unexpected error occurred while communicating with the ULPF Engine.",
            "UNKNOWN_CLIENT_ERROR",
            err
          )
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setRawLog("");
    setSourceHint("");
    setValidationError(null);
    onReset();
  };

  const loadPreset = (preset: (typeof SAMPLE_PRESETS)[0]) => {
    setRawLog(preset.log);
    setSourceHint(preset.hint);
    setValidationError(null);
  };

  // Handle local file drop directly into the processor
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Strict validation against images, PDFs, archives, binaries
      const validation = await validateLogFile(file);
      if (!validation.valid) {
        setValidationError(validation.error || "Unsupported file format.");
        return;
      }
      setValidationError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const textVal = validateLogText(content);
          if (!textVal.valid) {
            setValidationError(textVal.error || "Invalid file content.");
            return;
          }
          const extracted = extractLogsFromText(content);
          if (extracted.logs.length === 0) {
            setValidationError(
              `No valid log entries recognized in '${file.name}'. The content appears to be arbitrary plain text or recovery codes.`
            );
            return;
          }
          setRawLog(content.trim());
          if (!sourceHint) {
            setSourceHint(file.name.replace(/\.[^/.]+$/, "").slice(0, 50));
          }
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="bg-white dark:bg-[#17191F] rounded-2xl border border-slate-100 dark:border-[#292C35] p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      {/* Header & Quick Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-[#292C35]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F5F5F7] tracking-tight">
              Universal Raw Log Ingestion Terminal
            </h2>
          </div>
          <p className="text-xs text-slate-400 dark:text-[#A5A7B0] mt-0.5">
            Submit any raw security, network, or system log to invoke the live FastAPI ULPF Engine
          </p>
        </div>

        {/* Preset Sample Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-[#A5A7B0] mr-1 hidden sm:inline">
            Presets:
          </span>
          {SAMPLE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => loadPreset(preset)}
              disabled={isProcessing}
              className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-[#1D2027] hover:bg-orange-50 dark:hover:bg-[#8B5CF6]/20 text-slate-600 dark:text-[#A5A7B0] hover:text-orange-700 dark:hover:text-[#DDD6FE] text-[11px] font-medium border border-slate-200/80 dark:border-[#292C35] hover:border-orange-200 dark:hover:border-[#8B5CF6] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleProcess} className="mt-5 space-y-4">
        {/* Validation Error Alert Banner */}
        {validationError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start justify-between gap-2.5 text-xs text-rose-800 animate-in fade-in duration-200">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Invalid Input Rejected: </span>
                <span>{validationError}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-rose-500 hover:text-rose-800 p-0.5 rounded-md hover:bg-rose-100 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Raw Log Textarea with Drag & Drop */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="raw-log-input"
              className="text-xs font-bold text-slate-700 uppercase tracking-wider"
            >
              Raw Event Payload <span className="text-orange-600">*</span>
            </label>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              {extractedInfo.totalCount > 1 && (
                <span className="px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 font-sans font-bold text-[10px]">
                  {extractedInfo.totalCount} Log Entries (Batch Ready)
                </span>
              )}
              <span>
                {rawLog.length} chars · Lossless preservation active
              </span>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleFileDrop}
            className={`relative rounded-2xl border transition-all ${
              dragActive
                ? "border-orange-500 ring-4 ring-orange-500/10 bg-orange-50/20"
                : "border-slate-200 dark:border-[#292C35] hover:border-orange-300 dark:hover:border-[#8B5CF6] focus-within:border-orange-500 dark:focus-within:border-[#8B5CF6] focus-within:ring-4 focus-within:ring-orange-500/10 dark:focus-within:ring-[#8B5CF6]/20 bg-white dark:bg-[#17191F]"
            }`}
          >
            <textarea
              id="raw-log-input"
              rows={3}
              value={rawLog}
              onChange={(e) => setRawLog(e.target.value)}
              placeholder="Paste raw log string here (e.g., JSON object, CEF:0|Vendor|..., or Syslog RFC 5424/3164) or drag & drop a .log/.txt file..."
              disabled={isProcessing}
              className="w-full p-4 pr-8 text-xs font-mono text-slate-800 dark:text-[#F5F5F7] placeholder:text-slate-400 dark:placeholder:text-[#A5A7B0]/60 bg-transparent min-h-[85px] max-h-[260px] resize-y overflow-y-auto rounded-2xl outline-none leading-relaxed transition-[border-color]"
            />

            {/* Quick File Drop Hint Pill (positioned away from resize handle) */}
            <div className="absolute bottom-2.5 right-6 pointer-events-none hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-[#A5A7B0] bg-white/90 dark:bg-[#1D2027] backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-100 dark:border-[#292C35] shadow-2xs">
              <UploadCloud className="w-3 h-3 text-slate-400 dark:text-[#A5A7B0]" />
              <span>Drag & drop file to load</span>
            </div>
          </div>
        </div>

        {/* Bottom Controls: Source Hint & CTA buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Source Hint Input */}
          <div className="flex items-center gap-2 max-w-sm w-full">
            <span className="text-xs font-medium text-slate-500 dark:text-[#A5A7B0] shrink-0">
              Source Hint:
            </span>
            <input
              type="text"
              value={sourceHint}
              onChange={(e) => setSourceHint(e.target.value)}
              placeholder="e.g. cisco_asa, checkpoint_fw (optional)"
              disabled={isProcessing}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#17191F] border border-slate-200/80 dark:border-[#292C35] rounded-xl text-slate-700 dark:text-[#F5F5F7] placeholder:text-slate-400 dark:placeholder:text-[#A5A7B0]/60 focus:outline-none focus:border-orange-500 dark:focus:border-[#8B5CF6] focus:bg-white dark:focus:bg-[#17191F] transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleClear}
              disabled={isProcessing || (!rawLog && !sourceHint)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#292C35] text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-[#F5F5F7] hover:bg-slate-50 dark:hover:bg-[#1D2027] text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>

            <button
              type="submit"
              disabled={!rawLog.trim() || isProcessing}
              className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-[#8B5CF6] dark:hover:bg-[#6D28D9] text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing ULPF...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>
                    {extractedInfo.totalCount > 1
                      ? `Process Batch (${extractedInfo.totalCount} Logs)`
                      : "Process Log"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
