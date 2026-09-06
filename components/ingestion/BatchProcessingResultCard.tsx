"use client";

import React, { useState } from "react";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Download,
  RotateCcw,
  Terminal,
  Hash,
  ArrowRight,
} from "lucide-react";
import { BatchProcessResponse, ProcessingResult } from "@/lib/api/types";
import { ProcessingResultCard } from "./ProcessingResultCard";

interface BatchProcessingResultCardProps {
  batchResult: BatchProcessResponse;
  onReset?: () => void;
}

export function BatchProcessingResultCard({
  batchResult,
  onReset,
}: BatchProcessingResultCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const results = batchResult?.results || [];
  const selectedResult: ProcessingResult | undefined =
    results[selectedIndex] || results[0];

  const totalProcessingTime = results.reduce(
    (acc, cur) => acc + (cur?.processing_metadata?.processing_time_ms || 0),
    0
  );

  const handleExportBatch = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(batchResult, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `ulpf-batch-ingestion-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Batch Overview Header Card */}
      <div className="rounded-3xl bg-white border border-slate-100 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  batchResult.failed === 0
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}
              >
                {batchResult.failed === 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                )}
                <span>
                  {batchResult.failed === 0
                    ? "Batch Processing Complete"
                    : "Batch Completed with Issues"}
                </span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {totalProcessingTime.toFixed(3)} ms total latency
              </span>
            </div>

            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Batch Ingestion Telemetry · {batchResult.total} Events
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Lossless Universal Event Schema normalization and SHA-256 digest preservation across batch
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleExportBatch}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Batch JSON</span>
            </button>

            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear Batch</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Batch Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Processed
            </span>
            <span className="text-xl font-extrabold text-slate-900 font-mono mt-0.5 block">
              {batchResult.total}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
              Successful Normalization
            </span>
            <span className="text-xl font-extrabold text-emerald-700 font-mono mt-0.5 block">
              {batchResult.successful}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
              Failed / Malformed
            </span>
            <span className="text-xl font-extrabold text-rose-700 font-mono mt-0.5 block">
              {batchResult.failed}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100">
            <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider block">
              Avg Latency / Event
            </span>
            <span className="text-xl font-extrabold text-purple-700 font-mono mt-0.5 block">
              {batchResult.total > 0
                ? (totalProcessingTime / batchResult.total).toFixed(3)
                : 0}{" "}
              <span className="text-xs font-normal">ms</span>
            </span>
          </div>
        </div>

        {/* Batch Events Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Select an Event to Inspect Cryptographic Traceability
            </h3>
            <span className="text-xs text-purple-600 font-semibold">
              Showing item {results.length > 0 ? selectedIndex + 1 : 0} of {results.length}
            </span>
          </div>

          <div className="border border-slate-200/80 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto max-h-72 overflow-y-auto divide-y divide-slate-100">
              {results.map((item, index) => {
                const isSelected = index === selectedIndex;
                const format = (item?.format_detected || "unknown").toUpperCase();
                const status = item?.status || "failed";
                const norm = item?.normalized_event;
                const hashPreview = item?.raw_event_hash ? item.raw_event_hash.slice(0, 12) + "..." : "--";
                const rawSnippet = item?.raw_event
                  ? item.raw_event.slice(0, 80) + (item.raw_event.length > 80 ? "..." : "")
                  : "--";

                return (
                  <div
                    key={item?.event_id || index}
                    onClick={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-3.5 text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-purple-50/80 border-l-4 border-l-purple-600"
                        : "hover:bg-slate-50/80 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono font-bold text-slate-400 w-6 shrink-0">
                        #{index + 1}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                          status === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {status.toUpperCase()}
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold shrink-0">
                        {format}
                      </span>

                      <div className="truncate min-w-0 flex-1">
                        <span className="font-mono text-slate-700 text-[11px] truncate block">
                          {rawSnippet}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 pl-3">
                      <div className="hidden md:flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                        <Hash className="w-3 h-3 text-purple-600" />
                        <span>{hashPreview}</span>
                      </div>

                      <div className="flex items-center gap-1 font-semibold text-purple-600">
                        <span>{isSelected ? "Inspecting" : "Inspect"}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Inspection of the selected event */}
      {selectedResult && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Detailed Inspection · Event #{selectedIndex + 1} of {batchResult.total}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Event ID: {selectedResult.event_id}
            </span>
          </div>
          <ProcessingResultCard result={selectedResult} />
        </div>
      )}
    </div>
  );
}
