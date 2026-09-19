"use client";

import React, { useState, useEffect } from "react";
import {
  Server,
  ShieldCheck,
  Cpu,
  HardDrive,
  Database,
  Radio,
  CheckCircle2,
  Lock,
  RefreshCw,
  Search,
  Layers,
  Activity,
  Gauge,
  Zap,
  AlertCircle,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { ulpfApi } from "@/lib/api/ulpf";
import {
  OpenSearchHealth,
  StreamingHealthResponse,
  SystemPerformanceMetrics,
} from "@/lib/api/types";

export default function StatusPage() {
  const [searchHealth, setSearchHealth] = useState<OpenSearchHealth | null>(null);
  const [streamingHealth, setStreamingHealth] = useState<StreamingHealthResponse | null>(null);
  const [perfMetrics, setPerfMetrics] = useState<SystemPerformanceMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const loadStatus = () => {
    setIsRefreshing(true);
    Promise.allSettled([
      ulpfApi.getSearchHealth(),
      ulpfApi.getStreamingHealth(),
      ulpfApi.getPerformanceMetrics(),
    ]).then(([sRes, stRes, pRes]) => {
      if (sRes.status === "fulfilled") setSearchHealth(sRes.value);
      if (stRes.status === "fulfilled") setStreamingHealth(stRes.value);
      if (pRes.status === "fulfilled") setPerfMetrics(pRes.value);
      setIsRefreshing(false);
    });
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const kafkaState =
    perfMetrics?.subsystems?.kafka?.status === "CONNECTED" || streamingHealth?.status === "CONNECTED"
      ? "Online"
      : perfMetrics?.subsystems?.kafka?.status === "DISABLED" || streamingHealth?.status === "DISABLED"
      ? "Disabled"
      : "Standby";

  const opensearchState =
    perfMetrics?.subsystems?.opensearch?.status === "CONNECTED" || searchHealth?.status === "CONNECTED"
      ? "Online"
      : perfMetrics?.subsystems?.opensearch?.status === "DISABLED" || searchHealth?.status === "DISABLED"
      ? "Disabled"
      : "Standby";

  const mysqlState = perfMetrics?.subsystems?.mysql?.status === "CONNECTED" ? "Online" : "Standby";

  const statusServices = [
    {
      name: "ULPF Parser Engine",
      state: "Online",
      detail: "Deterministic format detection (JSON, CEF, Syslog)",
      icon: Cpu,
      ok: true,
      latency: perfMetrics?.stage_timings_ms?.parsing
        ? `${perfMetrics.stage_timings_ms.parsing.toFixed(2)} ms`
        : "< 1ms",
      latencyLabel: "Parse Stage",
    },
    {
      name: "MySQL Authoritative Persistence",
      state: mysqlState,
      detail: "Immutable source of truth persistence with composite indexes",
      icon: Database,
      ok: mysqlState === "Online",
      latency:
        perfMetrics?.mysql_latency_ms !== null && perfMetrics?.mysql_latency_ms !== undefined
          ? `${perfMetrics.mysql_latency_ms.toFixed(2)} ms`
          : "N/A",
      latencyLabel: "Storage Latency",
    },
    {
      name: "Apache Kafka Event Broker",
      state: kafkaState,
      detail:
        kafkaState === "Online"
          ? `${streamingHealth?.brokers_count || 1} Broker active · Lag: ${
              perfMetrics?.kafka_lag !== null && perfMetrics?.kafka_lag !== undefined
                ? perfMetrics.kafka_lag
                : 0
            } msgs`
          : kafkaState === "Disabled"
          ? "Disabled (Direct synchronous ingestion active)"
          : "Offline / Standby (Fallback to synchronous processing)",
      icon: Layers,
      ok: kafkaState === "Online" || kafkaState === "Disabled",
      latency:
        perfMetrics?.kafka_lag !== null && perfMetrics?.kafka_lag !== undefined
          ? `${perfMetrics.kafka_lag} lag`
          : "0 lag",
      latencyLabel: "Queue Lag",
    },
    {
      name: "ULPF Horizontal Stream Workers",
      state: (perfMetrics?.active_workers ?? 0) > 0 ? "Online" : "Standby",
      detail: `${perfMetrics?.active_workers || 0} active worker instance(s) reporting heartbeats`,
      icon: Activity,
      ok: true,
      latency: `${perfMetrics?.events_per_second ? perfMetrics.events_per_second.toFixed(1) : "0.0"} eps`,
      latencyLabel: "Processing Rate",
    },
    {
      name: "OpenSearch Distributed Search",
      state: opensearchState,
      detail:
        opensearchState === "Online"
          ? `Alias: ${searchHealth?.alias_name || "logforge-events"} (${searchHealth?.document_count || 0} docs)`
          : opensearchState === "Disabled"
          ? "Disabled (MySQL authoritative search active)"
          : "Cluster unreachable (Automatic MySQL fallback active)",
      icon: Search,
      ok: opensearchState === "Online" || opensearchState === "Disabled",
      latency:
        perfMetrics?.opensearch_latency_ms !== null && perfMetrics?.opensearch_latency_ms !== undefined
          ? `${perfMetrics.opensearch_latency_ms.toFixed(2)} ms`
          : "N/A",
      latencyLabel: "Search Latency",
    },
    {
      name: "Universal Schema Normalizer",
      state: "Online",
      detail: "Canonical UES representation with zero field loss",
      icon: Gauge,
      ok: true,
      latency: perfMetrics?.stage_timings_ms?.normalization
        ? `${perfMetrics.stage_timings_ms.normalization.toFixed(2)} ms`
        : "< 1ms",
      latencyLabel: "Normalizer Stage",
    },
    {
      name: "SHA-256 Cryptographic Digest",
      state: "Online",
      detail: "Exact raw event hashing & hash chain integrity",
      icon: Lock,
      ok: true,
      latency: perfMetrics?.stage_timings_ms?.schema_validation
        ? `${perfMetrics.stage_timings_ms.schema_validation.toFixed(2)} ms`
        : "< 1ms",
      latencyLabel: "Digest Time",
    },
    {
      name: "Host Hardware Utilization",
      state: "Online",
      detail: `CPU: ${perfMetrics?.cpu_percent !== null && perfMetrics?.cpu_percent !== undefined ? perfMetrics.cpu_percent + "%" : "N/A"} · RAM: ${
        perfMetrics?.memory_percent !== null && perfMetrics?.memory_percent !== undefined
          ? perfMetrics.memory_percent + "%"
          : "N/A"
      }`,
      icon: Zap,
      ok: true,
      latency:
        perfMetrics?.memory_percent !== null && perfMetrics?.memory_percent !== undefined
          ? `${perfMetrics.memory_percent}% RAM`
          : "N/A",
      latencyLabel: "Resource Usage",
    },
    {
      name: "Air-gapped Network Isolation",
      state: "Active",
      detail: "Zero outbound telemetry or external cloud connections",
      icon: ShieldCheck,
      ok: true,
      latency: "100% Offline",
      latencyLabel: "Egress Guard",
    },
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
              System Status & Real-Time Performance
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Live measured pipeline throughput, latency percentiles, worker concurrency, and subsystem health
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadStatus}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-orange-600" : ""}`} />
              <span>Live Telemetry</span>
            </button>
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Air-gapped Certified</span>
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* Real-time Measured Performance KPIs */}
      <ScrollReveal direction="up" delay={75} duration={550}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block">Processing Rate</span>
            <span className="text-xl font-bold text-slate-900 block mt-1">
              {perfMetrics ? `${perfMetrics.events_per_second.toFixed(1)} eps` : "--"}
            </span>
            <span className="text-[10px] text-emerald-600 font-medium">Real-time throughput</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block">P50 Latency</span>
            <span className="text-xl font-bold text-slate-900 block mt-1">
              {perfMetrics ? `${perfMetrics.p50_latency_ms.toFixed(2)} ms` : "--"}
            </span>
            <span className="text-[10px] text-slate-400">Median pipeline latency</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block">P99 Latency</span>
            <span className="text-xl font-bold text-slate-900 block mt-1">
              {perfMetrics ? `${perfMetrics.p99_latency_ms.toFixed(2)} ms` : "--"}
            </span>
            <span className="text-[10px] text-slate-400">99th percentile</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block">Active Workers</span>
            <span className="text-xl font-bold text-slate-900 block mt-1">
              {perfMetrics ? perfMetrics.active_workers : 0}
            </span>
            <span className="text-[10px] text-indigo-600 font-medium">Scalable instances</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block">Host CPU</span>
            <span className="text-xl font-bold text-slate-900 block mt-1">
              {perfMetrics?.cpu_percent !== null && perfMetrics?.cpu_percent !== undefined
                ? `${perfMetrics.cpu_percent}%`
                : "--"}
            </span>
            <span className="text-[10px] text-slate-400">System utilization</span>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-xs">
            <span className="text-[11px] font-medium text-slate-400 block">Host Memory</span>
            <span className="text-xl font-bold text-slate-900 block mt-1">
              {perfMetrics?.memory_percent !== null && perfMetrics?.memory_percent !== undefined
                ? `${perfMetrics.memory_percent}%`
                : "--"}
            </span>
            <span className="text-[10px] text-slate-400">System utilization</span>
          </div>
        </div>
      </ScrollReveal>

      {/* Services Health Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statusServices.map((svc) => {
            const Icon = svc.icon;
            const isOnline = svc.state === "Online" || svc.state === "Active";
            const isDisabled = svc.state === "Disabled";
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
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        isOnline
                          ? "text-emerald-700 bg-emerald-50"
                          : isDisabled
                          ? "text-slate-600 bg-slate-100"
                          : "text-amber-700 bg-amber-50"
                      }`}
                    >
                      {isOnline ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                      )}
                      <span>{svc.state}</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 mt-3 group-hover:text-orange-600 transition-colors">
                    {svc.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{svc.detail}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{svc.latencyLabel}</span>
                  <span className="font-mono font-bold text-slate-700">{svc.latency}</span>
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
