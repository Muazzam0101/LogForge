"use client";

import React from "react";
import { X, Layers, ArrowDown, Shield, Database, Cpu, FileText, CheckCircle2, Lock, Activity } from "lucide-react";

interface ExplorePipelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pipelineSteps = [
  {
    step: "01",
    title: "Heterogeneous Ingestion",
    desc: "Ingests streaming or batch logs from Firewalls, Routers, Linux/Windows endpoints, Cloud, and Containers.",
    icon: FileText,
    badge: "Syslog · JSON · XML · CEF · LEEF",
  },
  {
    step: "02",
    title: "Format Detection & Parser Routing",
    desc: "Autonomous pattern matching identifies syntax and dispatches to high-speed compiled parsers.",
    icon: Cpu,
    badge: "Deterministic Parsing",
  },
  {
    step: "03",
    title: "Lossless Raw Preservation",
    desc: "Calculates SHA-256 hash digests and stores raw log verbatim with zero information loss.",
    icon: Lock,
    badge: "Audit & Forensic Traceability",
  },
  {
    step: "04",
    title: "Schema Normalization",
    desc: "Maps heterogeneous fields into the LogForge Universal Common Schema (ULPF-ECS compatible).",
    icon: Database,
    badge: "Standardized Taxonomies",
  },
  {
    step: "05",
    title: "Validation & Enrichment",
    desc: "Validates field typing, GeoIP resolution, timestamp UTC alignment, and integrity hashing.",
    icon: CheckCircle2,
    badge: "Data Quality Assurance",
  },
  {
    step: "06",
    title: "SIEM & AI/ML Analytics Ready",
    desc: "Streams normalized events to OpenSearch, PostgreSQL, Vector Databases, and SOC dashboards.",
    icon: Activity,
    badge: "SOC / Threat Analytics Ready",
  },
];

export function ExplorePipelineModal({ isOpen, onClose }: ExplorePipelineModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ULPF Architecture & Pipeline
              </h3>
              <p className="text-xs text-slate-400">
                Universal Log Pre-processing Framework · SIH Problem ID 26156 (NTRO)
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

        {/* Pipeline Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="p-4 rounded-2xl bg-orange-50/60 border border-orange-100 text-xs text-orange-950 leading-relaxed">
            <span className="font-bold text-orange-700">LogForge Core Concept:</span> Modern enterprise security suffers from vendor format fragmentation. LogForge acts as the standardized universal normalization layer between diverse devices and downstream SIEM/AI platforms, guaranteeing lossless raw event retention.
          </div>

          {/* Steps Timeline */}
          <div className="space-y-3 pt-2">
            {pipelineSteps.map((item) => {
              return (
                <div
                  key={item.step}
                  className="flex items-start gap-4 p-3.5 rounded-2xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                    {item.step}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            National Technical Research Organisation (NTRO) Theme: Blockchain & Cybersecurity
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
