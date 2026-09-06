"use client";

import React, { useState, useRef } from "react";
import {
  ArrowDownToLine,
  UploadCloud,
  Terminal,
  Radio,
  Lock,
  Cpu,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Inbox,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";
import { LogProcessor } from "@/components/ingestion/LogProcessor";
import { ProcessingResultCard } from "@/components/ingestion/ProcessingResultCard";
import { BatchProcessingResultCard } from "@/components/ingestion/BatchProcessingResultCard";
import { BatchProcessResponse, ProcessingResult } from "@/lib/api/types";
import { ulpfApi, UlpfApiError } from "@/lib/api/ulpf";
import { extractLogsFromText } from "@/lib/utils/logExtractor";
import { validateLogFile, validateLogText } from "@/lib/utils/fileValidator";

export default function IngestionPage() {
  const {
    openUploadModal,
    activeResult,
    setActiveResult,
    setStagedLogContent,
  } = useModals();

  // Processing state
  const [processingError, setProcessingError] = useState<UlpfApiError | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState("Processing Raw Log via ULPF Pipeline...");

  const resultRef = useRef<HTMLDivElement>(null);
  const processorSectionRef = useRef<HTMLDivElement>(null);
  const dropzoneInputRef = useRef<HTMLInputElement>(null);

  // Smooth scroll to results whenever new activeResult arrives
  React.useEffect(() => {
    if (activeResult) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [activeResult]);

  const handleSuccess = (result: ProcessingResult) => {
    setActiveResult({ type: "single", data: result });
    setProcessingError(null);
  };

  const handleBatchSuccess = (batch: BatchProcessResponse) => {
    setActiveResult({ type: "batch", data: batch });
    setProcessingError(null);
  };

  const handleError = (error: UlpfApiError) => {
    setProcessingError(error);
    setActiveResult(null);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 100);
  };

  const handleReset = () => {
    setActiveResult(null);
    setProcessingError(null);
  };

  // Direct dropzone file handler with live backend upload & processing
  const handleDropzoneFile = async (file: File) => {
    // 1. Strict multi-layer file validation (reject images, PDFs, archives, binaries)
    const validation = await validateLogFile(file);
    if (!validation.valid) {
      handleError(
        new UlpfApiError(
          validation.error || "Unsupported file format. Please upload plain-text logs.",
          "INVALID_FILE_TYPE"
        )
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = (e.target?.result as string) || "";
      if (!text.trim()) {
        handleError(new UlpfApiError("The selected file is empty.", "EMPTY_FILE"));
        return;
      }

      // 2. Validate text against binary / PDF artifacts
      const textValidation = validateLogText(text);
      if (!textValidation.valid) {
        handleError(
          new UlpfApiError(textValidation.error || "Invalid file content.", "INVALID_INPUT")
        );
        return;
      }

      const extracted = extractLogsFromText(text);
      if (extracted.logs.length === 0) {
        handleError(
          new UlpfApiError(
            extracted.unrecognizedFormat
              ? `No valid log entries recognized in '${file.name}'. Content appears to be arbitrary plain text or recovery codes. LogForge accepts JSON, Syslog (RFC 5424/3164), and ArcSight CEF.`
              : "No valid log entries could be extracted from file.",
            "INVALID_INPUT"
          )
        );
        return;
      }

      const hint = file.name.replace(/\.[^/.]+$/, "").slice(0, 50);

      // Stage content into the terminal textarea so the user can inspect it
      setStagedLogContent({
        raw_log: text.trim(),
        source_hint: hint,
      });

      setIsProcessing(true);
      setProcessingStatusText(
        extracted.logs.length > 1
          ? `Batch Processing ${extracted.logs.length} Log Entries via ULPF Pipeline...`
          : "Processing Raw Log via ULPF Pipeline..."
      );

      try {
        if (extracted.logs.length > 1) {
          // Ingest and process batch
          const res = await ulpfApi.processBatch({
            raw_logs: extracted.logs.slice(0, 500),
            source_hint: hint,
          });
          handleBatchSuccess(res);
        } else {
          // Ingest and process single log
          const res = await ulpfApi.processLog({
            raw_log: extracted.logs[0],
            source_hint: hint,
          });
          handleSuccess(res);
        }
      } catch (err: unknown) {
        if (err instanceof UlpfApiError) {
          handleError(err);
        } else {
          handleError(
            new UlpfApiError(
              "Failed to process uploaded file through the ULPF backend engine.",
              "INGESTION_ERROR",
              err
            )
          );
        }
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      handleError(new UlpfApiError("Failed to read file from disk.", "IO_ERROR"));
    };

    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <span>Universal Log Pre-processing Framework · Live Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Log Ingestion & Normalization
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Deterministic high-speed ingestion listeners with zero-loss cryptographic raw retention
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Batch Logs</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Main Interactive Live Processor Card */}
      <div ref={processorSectionRef}>
        <ScrollReveal direction="up" delay={100} duration={600}>
          <LogProcessor
            onProcessSuccess={handleSuccess}
            onBatchSuccess={handleBatchSuccess}
            onProcessError={handleError}
            onReset={handleReset}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        </ScrollReveal>
      </div>

      {/* Results / Error Display Section */}
      <div ref={resultRef}>
        {isProcessing && (
          <div className="rounded-3xl bg-white border border-purple-100 p-8 text-center shadow-xs animate-in fade-in duration-200">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              {processingStatusText}
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Executing format detection, plugin parser selection, Universal Event Schema normalization, and SHA-256 hash generation...
            </p>
          </div>
        )}

        {processingError && (
          <div className="rounded-3xl bg-rose-50/70 border border-rose-200/80 p-6 sm:p-7 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-200/80 text-rose-800">
                    {processingError.code}
                  </span>
                  <span className="text-xs font-semibold text-rose-900">
                    Processing Failed
                  </span>
                </div>
                <p className="text-xs text-rose-700 font-medium pt-1">
                  {processingError.message}
                </p>
                <p className="text-[11px] text-rose-500 pt-1">
                  Please verify that the raw log matches a supported grammar (JSON, ArcSight CEF, or Syslog RFC 5424/3164) and that the backend server is running at http://127.0.0.1:8000.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Render Single Event Result */}
        {activeResult?.type === "single" && !isProcessing && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ProcessingResultCard result={activeResult.data} />
          </div>
        )}

        {/* Render Batch Processing Result */}
        {activeResult?.type === "batch" && !isProcessing && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <BatchProcessingResultCard batchResult={activeResult.data} onReset={handleReset} />
          </div>
        )}

        {/* Empty placeholder if nothing processed yet */}
        {!isProcessing && !processingError && !activeResult && (
          <div className="rounded-3xl bg-white border border-slate-100 p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No event processed yet
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Select one of the sample presets above, paste heterogeneous log strings, or drop a log file into the Ingestion Zone below to see real-time format detection, canonical normalization, and SHA-256 hash preservation.
            </p>
          </div>
        )}
      </div>

      {/* Interactive Dropzone Card */}
      <ScrollReveal direction="up" delay={200} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">
              Direct Log File Ingestion Zone
            </h2>
            <span className="text-xs text-slate-400">Live ULPF Upload</span>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleDropzoneFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => dropzoneInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all group"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 group-hover:bg-purple-100 text-purple-600 flex items-center justify-center mb-3 transition-colors shadow-xs">
              <UploadCloud className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Click to browse or drag log file to ingest immediately
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
              Supports single and multi-line logs: Syslog, ArcSight CEF, Structured JSON, NDJSON, and JSON arrays with lossless SHA-256 hash preservation.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dropzoneInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Browse File & Upload</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openUploadModal();
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:underline cursor-pointer"
              >
                <span>Open Detailed Ingestion Modal →</span>
              </button>
            </div>

            <input
              ref={dropzoneInputRef}
              type="file"
              accept=".log,.txt,.json,.cef,.syslog,.ndjson,text/plain,application/json"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleDropzoneFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </div>
        </div>
      </ScrollReveal>

      {/* Active Ingestion Pipelines Queue */}
      <ScrollReveal direction="up" delay={250} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Ingestion Jobs & Stream Queues
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live parsing worker threads and pipeline status
              </p>
            </div>
            <span className="text-xs font-medium text-slate-400">0 Active Jobs</span>
          </div>

          <div className="rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 animate-calm-pulse">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No ingestion jobs in progress
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Active parsing batches and live network syslog streams will appear here once telemetry is received.
            </p>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
