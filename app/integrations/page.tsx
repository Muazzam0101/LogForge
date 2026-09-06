"use client";

import React from "react";
import { Layers, Database, Search, HardDrive, Radio, CheckCircle2, Sliders, ExternalLink, ShieldCheck } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const integrationsList = [
  {
    name: "OpenSearch / Elasticsearch",
    category: "Full-Text Log Search & SIEM",
    desc: "Exports normalized schema documents with sharded indexing and fast Lucene aggregation.",
    status: "Awaiting Cluster URI",
    state: "standby",
    icon: Search,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    name: "PostgreSQL Event Store",
    category: "Relational Structured Storage",
    desc: "Stores partitioned event tables, user audit trails, and cryptographic SHA-256 verification logs.",
    status: "Awaiting Connection",
    state: "standby",
    icon: Database,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    name: "Apache Kafka Streaming Bus",
    category: "High-Volume Event Queue",
    desc: "Publishes normalized JSON events to downstream SOC topic streams and real-time SIEM consumers.",
    status: "Broker Standby",
    state: "standby",
    icon: Radio,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    name: "AWS S3 / MinIO Object Store",
    category: "Air-Gapped Cold Archive",
    desc: "Stores compressed original raw logs (lossless retention) with immutable checksum proofs.",
    status: "Bucket Standby",
    state: "standby",
    icon: HardDrive,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    name: "Splunk Enterprise HEC",
    category: "Downstream SIEM Target",
    desc: "Streams normalized CIM-compliant events via HTTP Event Collector endpoint.",
    status: "Not Configured",
    state: "unconfigured",
    icon: Layers,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    name: "AI Vector Database (Milvus / Chroma)",
    category: "Machine Learning Embedding Store",
    desc: "Stores vectorized log anomaly embeddings for automated threat clustering and similarity search.",
    status: "Model Standby",
    state: "standby",
    icon: Sliders,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>SIEM & Data Lake Connectors</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Integrations
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Stream normalized ULPF schemas to external SIEM, Data Lakes, and AI/ML vector stores
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Air-gapped Network Isolated</span>
          </div>
        </div>
      </ScrollReveal>

      {/* Integrations Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrationsList.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-purple-200/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center transition-transform group-hover:scale-105`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {item.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-purple-700 transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{item.category}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">Target Protocol: Ready</span>
                  <button className="text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1">
                    <span>Configure</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollReveal>
    </div>
  );
}
