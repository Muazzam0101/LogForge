"use client";

import React, { useState } from "react";
import { Search, Filter, Terminal, Calendar, SlidersHorizontal, RefreshCw, Download } from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";

export default function ExplorerPage() {
  const { openUploadModal } = useModals();
  const [query, setQuery] = useState("event.action: 'deny' AND network.transport: 'tcp'");

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>Universal Common Schema Query Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Logs Explorer
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Search normalized security events across heterogeneous sources with cryptographic hash validation
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={openUploadModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors"
            >
              <span>Upload Test Data</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Query Search Bar */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Query normalized logs (e.g. event.category == 'network' and action == 'deny')..."
                className="w-full pl-10 pr-4 py-3 bg-slate-50/90 hover:bg-slate-50 focus:bg-white text-xs sm:text-sm font-mono text-slate-800 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all shadow-2xs"
              />
            </div>

            <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-semibold rounded-2xl shadow-xs hover:shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2">
              <Search className="w-4 h-4" />
              <span>Execute Query</span>
            </button>
          </div>

          {/* Quick Filter Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </span>
            {[
              "event.action: deny",
              "source.device: firewall",
              "integrity.sha256: verified",
              "protocol: TCP",
              "severity >= 3",
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => setQuery(chip)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-[11px] font-mono font-medium text-slate-600 rounded-lg transition-colors border border-transparent hover:border-purple-200"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Query Results / Empty State */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-xs text-center">
          <div className="relative flex items-center justify-center mb-4">
            <span className="absolute w-14 h-14 rounded-2xl bg-slate-200/50 animate-radar-ring pointer-events-none" />
            <div className="relative w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shadow-xs">
              <Terminal className="w-7 h-7 stroke-[1.8]" />
            </div>
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            No normalized events found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5 mb-4 leading-relaxed">
            Query engine is standing by. Ingest raw log streams or upload batch files to execute full-text search and schema queries.
          </p>
          <button
            onClick={openUploadModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Upload Log File to Begin</span>
          </button>
        </div>
      </ScrollReveal>
    </div>
  );
}
