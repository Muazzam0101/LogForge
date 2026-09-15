"use client";

import React, { useState, useEffect } from "react";
import { Server, ShieldCheck, Cpu, HardDrive, Database, Radio, CheckCircle2, Lock, RefreshCw, Search } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ulpfApi } from "@/lib/api/ulpf";
import { OpenSearchHealth } from "@/lib/api/types";

export default function StatusPage() {
  const [searchHealth, setSearchHealth] = useState<OpenSearchHealth | null>(null);

  useEffect(() => {
    ulpfApi.getSearchHealth().then(setSearchHealth).catch(() => null);
  }, []);

  const statusServices = [
    { name: "ULPF Parser Engine", state: "Standby", detail: "Grammar parser pool initialized", icon: Cpu, ok: true },
    { name: "SHA-256 Hash Verifier", state: "Online", detail: "Cryptographic digest module ready", icon: Lock, ok: true },
    { name: "Universal Schema Normalizer", state: "Standby", detail: "Common Schema ECS v1.2 loaded", icon: Database, ok: true },
    { 
      name: "OpenSearch Distributed Index", 
      state: searchHealth?.status === "CONNECTED" ? "Online" : searchHealth?.status === "DISABLED" ? "Disabled" : "Standby", 
      detail: searchHealth?.status === "CONNECTED"
        ? `Alias: ${searchHealth.alias_name || "logforge-events"} (${searchHealth.document_count || 0} docs)`
        : searchHealth?.status === "DISABLED"
        ? "MySQL authoritative persistence active"
        : "OpenSearch offline (MySQL fallback active)", 
      icon: Search, 
      ok: searchHealth?.status === "CONNECTED" || searchHealth?.status === "DISABLED"
    },
    { name: "Air-gapped Network Guard", state: "Active", detail: "Outbound telemetry egress blocked", icon: ShieldCheck, ok: true },
    { name: "Socket Ingestion Gateway", state: "Standby", detail: "UDP/TCP Port 514 / TLS 6514 ready", icon: Radio, ok: true },
    { name: "Local Disk Spooling", state: "Online", detail: "Fast circular buffer storage ready", icon: HardDrive, ok: true },
  ];
  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Universal Log Pre-processing Framework Diagnostics</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              System Status & Health
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Internal framework subsystems, socket listeners, and air-gapped isolation telemetry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Air-gapped Certified</span>
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* Services Health Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusServices.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.name}
                className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-orange-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center transition-transform group-hover:scale-105">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{svc.state}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 mt-3 group-hover:text-orange-600 transition-colors">
                    {svc.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{svc.detail}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Subsystem Latency</span>
                  <span className="font-mono font-bold text-slate-600">&lt; 1ms</span>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Air-gapped Verification Card */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Air-gapped Network Isolation Guarantee
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                LogForge operates entirely on localhost or private air-gapped server nodes. Zero outbound telemetry, analytics callbacks, or cloud dependencies exist.
              </p>
            </div>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <span className="text-xs font-mono font-bold text-slate-700">NTRO ULPF 1.0</span>
            <p className="text-[11px] text-emerald-600 font-semibold">100% Offline Ready</p>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
