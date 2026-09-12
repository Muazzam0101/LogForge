"use client";

import React from "react";
import { ShieldAlert, Brain, Activity, Lock, AlertOctagon, Terminal, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";

const mitreTactics = [
  { id: "TA0001", name: "Initial Access", desc: "Spearphishing, exploit public application", rules: "14 Active Rules" },
  { id: "TA0002", name: "Execution", desc: "Command & Scripting Interpreter, PowerShell", rules: "22 Active Rules" },
  { id: "TA0003", name: "Persistence", desc: "Account creation, scheduled task, cron jobs", rules: "18 Active Rules" },
  { id: "TA0004", name: "Privilege Escalation", desc: "Sudo abuse, process injection, token manipulation", rules: "12 Active Rules" },
  { id: "TA0005", name: "Defense Evasion", desc: "Log tampering, masquerading, indicator removal", rules: "16 Active Rules" },
  { id: "TA0010", name: "Exfiltration", desc: "Data transfer over C2, cloud storage drop", rules: "9 Active Rules" },
];

export default function ThreatsPage() {
  const { openUploadModal } = useModals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-700 text-xs font-semibold mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>AI/ML Threat Intelligence Matrix</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Threat Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              MITRE ATT&CK correlation engine and unsupervised behavioral anomaly detection
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold self-start sm:self-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Engine in Standby</span>
          </div>
        </div>
      </ScrollReveal>

      {/* MITRE ATT&CK Matrix Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              MITRE ATT&CK Enterprise Matrix Mapping
            </h2>
            <span className="text-[11px] font-semibold text-slate-400">
              91 Total Detection Signatures
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mitreTactics.map((tac) => (
              <div
                key={tac.id}
                className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-orange-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      {tac.id}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {tac.rules}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-3 group-hover:text-orange-600 transition-colors">
                    {tac.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {tac.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">Detections:</span>
                  <span className="font-mono font-bold text-slate-600">0</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Threat Engine Standby Box */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-center">
          <div className="relative flex items-center justify-center mb-4">
            <span className="absolute w-14 h-14 rounded-2xl bg-orange-100/50 animate-radar-ring pointer-events-none" />
            <div className="relative w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shadow-xs">
              <Brain className="w-7 h-7 stroke-[1.8]" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            Threat Engine Standby
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 mb-4 leading-relaxed">
            AI/ML anomaly scoring and MITRE correlation rules will trigger once streaming or batch normalized events pass through the ULPF ingestion pipeline.
          </p>
          <button
            onClick={openUploadModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <span>Upload Logs to Analyze</span>
          </button>
        </div>
      </ScrollReveal>
    </div>
  );
}
