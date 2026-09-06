"use client";

import React, { useState } from "react";
import { X, UploadCloud, FileCode, CheckCircle2, ShieldCheck, ArrowRight, Lock } from "lucide-react";

interface UploadLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadLogsModal({ isOpen, onClose }: UploadLogsModalProps) {
  const [dragOver, setDragOver] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Upload Log Files
              </h3>
              <p className="text-xs text-slate-400">
                Universal Log Pre-processing Framework · Lossless Ingestion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
            }}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              dragOver
                ? "border-purple-500 bg-purple-50/50"
                : "border-slate-200 hover:border-purple-400 bg-slate-50/50"
            }`}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-white text-purple-600 shadow-sm border border-purple-100 flex items-center justify-center mb-3">
              <FileCode className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">
              Drag and drop log files here
            </h4>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Supports .log, .json, .csv, .xml, .txt, .cef, .evtx, .pcap (Max 2GB per batch)
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-colors">
              <UploadCloud className="w-4 h-4" />
              <span>Browse Local Files</span>
              <input type="file" className="hidden" multiple />
            </label>
          </div>

          {/* Supported Standards Grid */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Supported Formats & Standards
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {[
                "Syslog (RFC 5424/3164)",
                "CEF (ArcSight)",
                "LEEF (QRadar)",
                "Structured JSON",
                "Windows EVTX",
                "Cisco ASA / Firewall",
                "Nginx / Apache Combined",
                "Custom Regex Grammar",
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-colors"
            >
              Ready to Ingest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
