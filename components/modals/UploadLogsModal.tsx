"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  UploadCloud,
  FileCode,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Lock,
  Loader2,
  AlertCircle,
  FileText,
  Play,
  Layers,
} from "lucide-react";
import { ulpfApi, UlpfApiError } from "@/lib/api/ulpf";
import { useModals } from "@/components/context/ModalContext";
import { extractLogsFromText } from "@/lib/utils/logExtractor";
import { validateLogFile, validateLogText } from "@/lib/utils/fileValidator";

interface UploadLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SelectedFileInfo {
  file: File;
  rawContent: string;
  logs: string[];
  name: string;
  sizeKb: string;
  count: number;
  isBatch: boolean;
}

export function UploadLogsModal({ isOpen, onClose }: UploadLogsModalProps) {
  const router = useRouter();
  const { setActiveResult, setStagedLogContent } = useModals();
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SelectedFileInfo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processLoadedFile = async (file: File) => {
    setUploadError(null);

    // 1. Strict multi-layer file validation (reject images, PDFs, archives, binaries)
    const validation = await validateLogFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || "Unsupported file format. Please upload plain-text logs.");
      setSelectedFile(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = (e.target?.result as string) || "";
      if (!text.trim()) {
        setUploadError("The selected file is empty. Please select a valid log file.");
        setSelectedFile(null);
        return;
      }

      // 2. Validate text against binary / PDF artifacts
      const textValidation = validateLogText(text);
      if (!textValidation.valid) {
        setUploadError(textValidation.error || "Invalid file content.");
        setSelectedFile(null);
        return;
      }

      const extracted = extractLogsFromText(text);
      if (extracted.logs.length === 0) {
        if (extracted.unrecognizedFormat) {
          setUploadError(
            `No valid log entries recognized in '${file.name}'. The content appears to be arbitrary plain text, recovery codes, or unsupported data. LogForge requires structured formats: JSON, Syslog (RFC 5424/3164), or ArcSight CEF.`
          );
        } else {
          setUploadError("Unable to extract valid log lines from the selected file.");
        }
        setSelectedFile(null);
        return;
      }

      setSelectedFile({
        file,
        rawContent: text.trim(),
        logs: extracted.logs,
        name: file.name,
        sizeKb: (file.size / 1024).toFixed(1),
        count: extracted.logs.length,
        isBatch: extracted.logs.length > 1,
      });
    };

    reader.onerror = () => {
      setUploadError("Failed to read file from disk. Please try again.");
      setSelectedFile(null);
    };

    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processLoadedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processLoadedFile(e.dataTransfer.files[0]);
    }
  };

  // Action 1: Ingest & process immediately through live FastAPI ULPF Engine
  const handleProcessNow = async () => {
    if (!selectedFile || isSubmitting) return;

    setIsSubmitting(true);
    setUploadError(null);

    try {
      const hint = selectedFile.name.replace(/\.[^/.]+$/, "").slice(0, 50);

      if (selectedFile.isBatch) {
        // Multi-line / Array batch processing (up to 500 items)
        const batchResponse = await ulpfApi.processBatch({
          raw_logs: selectedFile.logs.slice(0, 500),
          source_hint: hint,
        });

        setActiveResult({ type: "batch", data: batchResponse });
      } else {
        // Single log processing
        const singleResult = await ulpfApi.processLog({
          raw_log: selectedFile.logs[0],
          source_hint: hint,
        });

        setActiveResult({ type: "single", data: singleResult });
      }

      // Also stage the raw log content into the terminal for visibility
      setStagedLogContent({
        raw_log: selectedFile.rawContent,
        source_hint: hint,
      });

      onClose();
      setSelectedFile(null);
      // Navigate to ingestion page to view results
      router.push("/ingestion");
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        setUploadError(`[${err.code}] ${err.message}`);
      } else {
        setUploadError("Failed to process file through ULPF backend engine.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action 2: Load into terminal editor on /ingestion
  const handleLoadToTerminal = () => {
    if (!selectedFile) return;
    const hint = selectedFile.name.replace(/\.[^/.]+$/, "").slice(0, 50);
    setStagedLogContent({
      raw_log: selectedFile.rawContent,
      source_hint: hint,
    });
    onClose();
    setSelectedFile(null);
    router.push("/ingestion");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Upload Log Files
              </h3>
              <p className="text-xs text-slate-400">
                Universal Log Pre-processing Framework · Live ULPF Engine Ingestion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Error Banner if any */}
          {uploadError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Ingestion Error: </span>
                <span>{uploadError}</span>
              </div>
            </div>
          )}

          {/* Drag and Drop Zone or Selected File View */}
          {!selectedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                dragOver
                  ? "border-orange-500 bg-orange-50/50"
                  : "border-slate-200 hover:border-orange-400 bg-slate-50/50"
              }`}
            >
              <div className="w-14 h-14 mx-auto rounded-2xl bg-white text-orange-600 shadow-sm border border-orange-100 flex items-center justify-center mb-3">
                <FileCode className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                Drag and drop log file here
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Supports .log, .json, .txt, .cef, .syslog with exact byte SHA-256 preservation
              </p>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Browse Local Files</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".log,.txt,.json,.cef,.syslog,.ndjson,text/plain,application/json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          ) : (
            /* Selected File Card */
            <div className="p-4 rounded-2xl border border-orange-200 bg-orange-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      {selectedFile.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{selectedFile.sizeKb} KB</span>
                      <span>·</span>
                      <span className="font-semibold text-orange-700">
                        {selectedFile.count} {selectedFile.count === 1 ? "log entry" : "log entries"}
                      </span>
                      {selectedFile.isBatch && (
                        <span className="px-1.5 py-0.2 rounded-md bg-orange-100 text-orange-700 font-bold text-[10px]">
                          BATCH READY
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Log Snippet Preview */}
              <div className="p-3 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] max-h-28 overflow-y-auto leading-relaxed">
                <code>{selectedFile.rawContent.slice(0, 350)}{selectedFile.rawContent.length > 350 ? "..." : ""}</code>
              </div>
            </div>
          )}

          {/* Supported Standards Grid */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Supported Formats & Standards
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {[
                "Syslog (RFC 5424/3164)",
                "CEF (ArcSight)",
                "Structured JSON",
                "JSON Arrays / NDJSON",
                "Firewall Events",
                "Linux Auth Logs",
                "Cisco ASA",
                "Custom Key-Value",
              ].map((format) => (
                <div
                  key={format}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] font-medium text-slate-600 truncate"
                >
                  {format}
                </div>
              ))}
            </div>
          </div>

          {/* Lossless & Air-gapped Guarantee */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-indigo-950">
                Universal Log Pre-processing Guarantee
              </p>
              <p className="text-indigo-800/80 mt-0.5 leading-relaxed text-[11px]">
                Original raw logs are preserved verbatim with SHA-256 checksums to maintain complete audit traceability between raw events and normalized security schemas.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Air-gapped local environment</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {selectedFile && (
              <button
                type="button"
                onClick={handleLoadToTerminal}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer"
              >
                Load into Terminal
              </button>
            )}

            <button
              onClick={selectedFile ? handleProcessNow : () => fileInputRef.current?.click()}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {selectedFile?.isBatch ? `Processing ${selectedFile.count} logs...` : "Processing..."}
                  </span>
                </>
              ) : selectedFile ? (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>
                    {selectedFile.isBatch ? `Process Batch (${selectedFile.count} Logs)` : "Process File"}
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Select File</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
