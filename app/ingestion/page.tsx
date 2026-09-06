"use client";

import React, { useState } from "react";
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
  RefreshCw,
  Clock,
  Inbox,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";

export default function IngestionPage() {
  const { openUploadModal } = useModals();
  const [selectedProtocol, setSelectedProtocol] = useState<"all" | "syslog" | "file" | "stream">("all");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <span>Universal Log Pre-processing Framework</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Log Ingestion Engine
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Deterministic high-speed ingestion listeners with zero-loss cryptographic raw retention
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Batch Logs</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Socket & Stream Listeners Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              title: "Syslog UDP Listener",
              port: "Port 514 UDP",
              state: "Standby",
              desc: "RFC 5424 / 3164 socket",
              color: "text-purple-600",
              bg: "bg-purple-50",
            },
            {
              title: "Syslog TCP Listener",
              port: "Port 514 TCP",
              state: "Standby",
              desc: "High-throughput stream",
              color: "text-indigo-600",
              bg: "bg-indigo-50",
            },
            {
              title: "TLS Encrypted Syslog",
              port: "Port 6514 TLS",
              state: "Standby",
              desc: "Awaiting cert mount",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              title: "Offline Batch Watcher",
              port: "Local FS Drop",
              state: "Ready",
              desc: "Air-gapped batch ingest",
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-purple-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${item.bg} ${item.color}`}>
                  {item.port}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  {item.state}
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-800 mt-3">{item.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Ingested Telemetry:</span>
                <span className="font-mono font-bold text-slate-600">--</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Interactive Dropzone Card */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">
              Direct Log File Ingestion Zone
            </h2>
            <span className="text-xs text-slate-400">Air-gapped compatible</span>
          </div>

          <div
            onClick={openUploadModal}
            className="border-2 border-dashed border-slate-200 hover:border-purple-400 hover:bg-purple-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all group"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 group-hover:bg-purple-100 text-purple-600 flex items-center justify-center mb-3 transition-colors shadow-xs">
              <UploadCloud className="w-7 h-7 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Click to select or drag log files to ingest
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-3">
              Automatically parses Syslog, CEF, LEEF, Windows EVTX, JSON, and custom appliance formats with SHA-256 hash preservation.
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 group-hover:underline">
              <span>Open Ingestion Dialog</span>
              <span>→</span>
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* Active Ingestion Pipelines Queue */}
      <ScrollReveal direction="up" delay={200} duration={600}>
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
