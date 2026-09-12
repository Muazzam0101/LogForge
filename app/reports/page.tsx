"use client";

import React from "react";
import { FileText, Download, ShieldCheck, Lock, CheckCircle2, RefreshCw } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-orange-50 border border-orange-100 text-orange-700 text-xs font-semibold mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cryptographic Forensic Verification</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Audit & Forensic Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Export verified SHA-256 event traces, parser statistics, and compliance summaries
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer">
              <FileText className="w-4 h-4" />
              <span>Generate New Report</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Report Templates Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "SHA-256 Chain of Custody",
              desc: "Cryptographic proof linking normalized schemas to immutable raw log digests.",
              format: "PDF & JSONL",
              badge: "Forensics Ready",
            },
            {
              title: "Parser Health & Lossless Audit",
              desc: "Reports zero-loss validation across all ingested fields, grammar errors, and token drops.",
              format: "CSV & JSON",
              badge: "Quality Audit",
            },
            {
              title: "CERT-In Compliance Summary",
              desc: "Pre-configured format adhering to Indian cybersecurity 6-hour incident reporting requirements.",
              format: "PDF & Encrypted ZIP",
              badge: "NTRO Compliant",
            },
          ].map((rep) => (
            <div
              key={rep.title}
              className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-orange-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                  {rep.badge}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-3 group-hover:text-orange-600 transition-colors">
                  {rep.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rep.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Format: {rep.format}</span>
                <span className="font-semibold text-orange-600 cursor-pointer hover:underline">
                  Download Template
                </span>
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>

      {/* Generated Reports List / Empty State */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-2xl p-12 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3 animate-calm-pulse">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            No reports generated yet
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4 leading-relaxed">
            Audit logs and forensic integrity reports will be saved here once batch data has been processed.
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}
