"use client";

import React, { useState } from "react";
import { Settings as SettingsIcon, ShieldCheck, Database, Lock, Sliders, CheckCircle2, Save } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function SettingsPage() {
  const [retentionEnabled, setRetentionEnabled] = useState(true);
  const [airGappedMode, setAirGappedMode] = useState(true);
  const [autoDetectFormat, setAutoDetectFormat] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold mb-2">
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Framework Configuration</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Platform & Schema Settings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Manage Universal Log Pre-processing Framework options, lossless preservation hashes, and air-gapped isolation
            </p>
          </div>

          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto">
            <Save className="w-4 h-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Settings Options */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs divide-y divide-slate-100">
          {/* Setting 1 */}
          <div className="py-4.5 flex items-center justify-between gap-4 first:pt-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Lossless Raw Event Preservation
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Verbatim raw payload is stored alongside the normalized schema record with cryptographic SHA-256 hash validation.
              </p>
            </div>
            <button
              onClick={() => setRetentionEnabled(!retentionEnabled)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                retentionEnabled ? "bg-purple-600" : "bg-slate-200"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  retentionEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Setting 2 */}
          <div className="py-4.5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Air-gapped Network Isolation Mode
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Disables external telemetry ping, third-party analytics scripts, and remote CDN asset fetches.
              </p>
            </div>
            <button
              onClick={() => setAirGappedMode(!airGappedMode)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                airGappedMode ? "bg-emerald-600" : "bg-slate-200"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  airGappedMode ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Setting 3 */}
          <div className="py-4.5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Autonomous Format Auto-Discovery
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically matches regex patterns to identify Syslog, CEF, LEEF, EVTX, or JSON syntax on incoming ports.
              </p>
            </div>
            <button
              onClick={() => setAutoDetectFormat(!autoDetectFormat)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoDetectFormat ? "bg-purple-600" : "bg-slate-200"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoDetectFormat ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Setting 4: SIH metadata */}
          <div className="py-4.5 flex items-center justify-between gap-4 last:pb-0">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Smart India Hackathon (SIH) 2026 Reference
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Problem Statement ID: 26156 · National Technical Research Organisation (NTRO) · Theme: Blockchain & Cybersecurity
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl">
              ULPF Core v1.0
            </span>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
