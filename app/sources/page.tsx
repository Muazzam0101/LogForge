"use client";

import React from "react";
import { Plus, Sliders, Shield, Terminal, Server, Cpu, Database, Cloud, Network, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";

const parsersCatalog = [
  {
    name: "Cisco ASA / Firepower",
    format: "Syslog / CEF",
    type: "Firewall & Security Appliance",
    desc: "Extracts connection drops, NAT translations, VPN tunnels, and threat events.",
    badge: "Deterministic",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    name: "Linux Auditd & Syslog",
    format: "RFC 5424 / 3164",
    type: "Operating System Telemetry",
    desc: "Parses system call tracking, user authentication, sudo commands, and kernel alerts.",
    badge: "High Performance",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    name: "Windows Security EVTX",
    format: "XML / Structured EVTX",
    type: "Active Directory & Host Log",
    desc: "Normalizes event IDs 4624 (Logon), 4625 (Failed Logon), 4688 (Process Creation).",
    badge: "Lossless Raw Retention",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    name: "Snort & Suricata NIDS",
    format: "EVE JSON / Alert Log",
    type: "Network Intrusion Detection",
    desc: "Ingests packet inspection signatures, payload hex dumps, and CVE references.",
    badge: "Deterministic",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    name: "Web Servers (Nginx / Apache)",
    format: "Combined Log Format",
    type: "Application Gateway",
    desc: "Parses HTTP status codes, URI paths, user agents, upstream latency, and GeoIP.",
    badge: "High Throughput",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    name: "Cloud Telemetry (AWS / Azure)",
    format: "JSON CloudTrail / VPC Flow",
    type: "Cloud Infrastructure",
    desc: "Tracks IAM policy changes, security group updates, and VPC packet rejections.",
    badge: "Multi-Cloud",
    color: "text-cyan-600",
    bg: "bg-cyan-50",
  },
];

export function SourcesPage() {
  const { openAddSourceModal } = useModals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-purple-50 border border-purple-100 text-purple-700 text-xs font-semibold mb-2">
              <Sliders className="w-3.5 h-3.5" />
              <span>Plug-and-Play Parser Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sources & Parsers
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Deterministic parser repository for heterogeneous network appliances, servers, and cloud providers
            </p>
          </div>

          <button
            onClick={openAddSourceModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Connect Log Source</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Parser Catalog Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Built-in Parser Library
            </h2>
            <span className="text-[11px] font-semibold text-purple-600">
              Deterministic Grammar Rules
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parsersCatalog.map((parser) => (
              <div
                key={parser.name}
                className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-xs hover:border-purple-200/80 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${parser.bg} ${parser.color}`}>
                      {parser.format}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                      {parser.badge}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-3 group-hover:text-purple-700 transition-colors">
                    {parser.name}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">{parser.type}</p>
                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                    {parser.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Parser Status:</span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Compiled & Active</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Connected Sources Matrix with Empty State */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Connected Device Inventory
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Active telemetry emitters and stream health
              </p>
            </div>
            <span className="text-xs text-slate-400">0 connected</span>
          </div>

          <div className="rounded-2xl border border-slate-100 p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 animate-calm-pulse">
              <Network className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              No log sources connected
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Onboard a firewall, server, or container log stream to begin normalized data ingestion.
            </p>
            <button
              onClick={openAddSourceModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Connect First Device</span>
            </button>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
export default SourcesPage;
