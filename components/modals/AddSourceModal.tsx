"use client";

import React, { useState } from "react";
import { X, Plus, Server, Network, Shield, Cpu, Terminal, ArrowRight, Check } from "lucide-react";

interface AddSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sourceOptions = [
  { id: "firewall", name: "Network Firewall", desc: "Cisco ASA, Fortinet, Palo Alto, pfSense", icon: Shield },
  { id: "router", name: "Router & Switch", desc: "Cisco IOS, Juniper JunOS, Arista EOS", icon: Network },
  { id: "linux", name: "Linux Server", desc: "RHEL, Ubuntu, Debian Syslog & Auditd", icon: Terminal },
  { id: "windows", name: "Windows Host", desc: "Windows Security & System EVTX logs", icon: Server },
  { id: "ids", name: "IDS / IPS", desc: "Snort, Suricata, Zeek network alerts", icon: Cpu },
];

export function AddSourceModal({ isOpen, onClose }: AddSourceModalProps) {
  const [selectedSource, setSelectedSource] = useState("firewall");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Connect Log Source
              </h3>
              <p className="text-xs text-slate-400">
                Universal Log Pre-processing Framework · Plug-and-Play Onboarding
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

        {/* Body */}
        <div className="p-6 space-y-4">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Select Device / Technology Type
          </label>
          <div className="space-y-2.5">
            {sourceOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedSource === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelectedSource(opt.id)}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "border-orange-500 bg-orange-50/50 shadow-xs ring-1 ring-orange-500/30"
                      : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isSelected
                          ? "bg-orange-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        {opt.name}
                      </h4>
                      <p className="text-[11px] text-slate-400">{opt.desc}</p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ingestion protocol note */}
          <div className="pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-[11px] text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-800">Transport:</span> Accepts Syslog UDP/TCP (Port 514 / 6514 TLS), Beats forwarder, or batch offline file drop. LogForge will automatically detect the syntax and apply appropriate grammar parsing.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white shadow-xs transition-colors cursor-pointer"
          >
            <span>Proceed to Configuration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
