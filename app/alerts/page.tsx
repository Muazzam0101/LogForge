"use client";

import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Filter, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";

export default function AlertsPage() {
  const { openUploadModal } = useModals();
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | "critical" | "high" | "medium" | "low">("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold mb-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Real-Time Incident Triage</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Security Alerts
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Prioritized incident queue generated from normalized security events and correlation models
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>0 Unresolved Incidents</span>
            </span>
          </div>
        </div>
      </ScrollReveal>

      {/* Severity Triage Filter Tabs */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Alerts", count: 0 },
            { id: "critical", label: "Critical", count: 0, color: "text-rose-600" },
            { id: "high", label: "High", count: 0, color: "text-amber-600" },
            { id: "medium", label: "Medium", count: 0, color: "text-blue-600" },
            { id: "low", label: "Low", count: 0, color: "text-slate-600" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedSeverity(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                selectedSeverity === tab.id
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedSeverity === tab.id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Incident Queue Table */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs">
          <div className="w-full overflow-hidden rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Alert Name</th>
                  <th className="py-3 px-4">Source Asset</th>
                  <th className="py-3 px-4">MITRE Technique</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                        <ShieldCheck className="w-6 h-6 animate-calm-pulse" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">
                        No security alerts
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                        Threat detections and security alerts will appear here once analytics rules evaluate the incoming log telemetry.
                      </p>
                      <button
                        onClick={openUploadModal}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors"
                      >
                        <span>Simulate Alert Ingestion</span>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
