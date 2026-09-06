"use client";

import React from "react";
import { ArrowRight, FileCode, Cpu, Database, ShieldAlert, Layers } from "lucide-react";

interface PipelineHeroProps {
  onUploadClick: () => void;
  onExploreClick: () => void;
}

export function PipelineHero({ onUploadClick, onExploreClick }: PipelineHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#5b46f6] via-[#6d46f3] to-[#875bf7] text-white p-5 sm:p-7 md:p-8 lg:p-9 shadow-lg shadow-indigo-500/10 border border-indigo-400/20 group">
      {/* Background ambient radial glow with subtle breathing animation */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-white/10 blur-3xl pointer-events-none animate-calm-pulse" />
      <div className="absolute bottom-0 left-1/3 -mb-20 w-60 sm:w-80 h-60 sm:h-80 rounded-full bg-purple-400/15 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
        {/* Left Copy Area */}
        <div className="w-full lg:flex-1 space-y-3.5 sm:space-y-4 text-left">
          <div className="relative inline-flex items-center px-3.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-[11px] font-bold tracking-wider uppercase overflow-hidden shadow-xs">
            <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-30" />
            <span>Turn Logs into Intelligence</span>
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[2.1rem] font-extrabold tracking-tight leading-[1.2] text-white drop-shadow-xs">
            From raw logs to real security insights.
          </h2>

          <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed font-normal max-w-xl">
            Ingest logs from multiple sources, normalize them into a unified schema, preserve the original event with cryptographic SHA-256 traceability, and prepare them for downstream SIEM analytics.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={onUploadClick}
              className="group/btn inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white text-indigo-700 hover:text-indigo-800 font-bold text-xs sm:text-sm shadow-md hover:shadow-xl hover:bg-indigo-50 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-95"
            >
              <span>Upload Logs</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1.5" />
            </button>

            <button
              onClick={onExploreClick}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs sm:text-sm font-semibold backdrop-blur-xs transition-all duration-300 hover:border-white/40 active:scale-95"
            >
              <Layers className="w-4 h-4 text-indigo-200" />
              <span>Explore Pipeline</span>
            </button>
          </div>
        </div>

        {/* Right Pipeline Cards - Responsive 2x2 with Micro Hover Animations */}
        <div className="w-full lg:w-auto lg:max-w-md xl:max-w-lg shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {/* Stage 1: Raw Logs */}
            <div className="group/card relative bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 hover:border-white/40 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 group-hover/card:bg-white/30 flex items-center justify-center text-white shadow-inner transition-colors">
                  <FileCode className="w-3.5 h-3.5 text-indigo-100" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 bg-white/10 px-2 py-0.5 rounded-full">
                  Step 01
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                Raw Logs
              </div>
              <div className="mt-1.5 text-[11px] text-indigo-100/85 space-y-0.5 font-medium">
                <div>Syslog · JSON · CEF</div>
                <div className="text-[10px] text-white/60">Lossless Verbatim</div>
              </div>
            </div>

            {/* Stage 2: Processing */}
            <div className="group/card relative bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 hover:border-white/40 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 group-hover/card:bg-white/30 flex items-center justify-center text-white shadow-inner transition-colors">
                  <Cpu className="w-3.5 h-3.5 text-indigo-100" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 bg-white/10 px-2 py-0.5 rounded-full">
                  Step 02
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                Processing
              </div>
              <div className="mt-1.5 text-[11px] text-indigo-100/85 space-y-0.5 font-medium">
                <div>Format Detection</div>
                <div className="text-[10px] text-white/60">Grammar Parsing</div>
              </div>
            </div>

            {/* Stage 3: Normalized */}
            <div className="group/card relative bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 hover:border-white/40 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 group-hover/card:bg-white/30 flex items-center justify-center text-white shadow-inner transition-colors">
                  <Database className="w-3.5 h-3.5 text-indigo-100" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 bg-white/10 px-2 py-0.5 rounded-full">
                  Step 03
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                Normalized
              </div>
              <div className="mt-1.5 text-[11px] text-indigo-100/85 space-y-0.5 font-medium">
                <div>Common Schema</div>
                <div className="text-[10px] text-white/60">SHA-256 Digest</div>
              </div>
            </div>

            {/* Stage 4: Security Insights */}
            <div className="group/card relative bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-2xl p-3.5 border border-white/30 hover:border-white/50 shadow-md shadow-black/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ring-1 ring-white/20 cursor-default">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-white/25 group-hover/card:bg-white/35 flex items-center justify-center text-white shadow-inner transition-colors">
                  <ShieldAlert className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-100 bg-white/15 px-2 py-0.5 rounded-full">
                  Step 04
                </span>
              </div>
              <div className="text-xs sm:text-sm font-bold text-white leading-snug">
                Security Insights
              </div>
              <div className="mt-1.5 text-[11px] text-white/90 space-y-0.5 font-medium">
                <div>SIEM & AI-Ready</div>
                <div className="text-[10px] text-white/70">Threat Analytics</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
