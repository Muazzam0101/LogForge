"use client";

import React from "react";
import { ChevronDown, BarChart2, UploadCloud } from "lucide-react";

interface EventTrendProps {
  onUploadClick?: () => void;
}

export function EventTrend({ onUploadClick }: EventTrendProps) {
  const yAxisMarkers = ["8K", "6K", "4K", "2K", "0"];
  const xAxisMarkers = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"];

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Card Header matching reference image */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Event Trends
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Ingested vs Normalized vs Alerts
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-slate-600 hover:text-purple-700 transition-colors cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 transition-transform group-hover:scale-110" />
              Ingested
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 transition-transform group-hover:scale-110" />
              Normalized
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 hover:text-rose-600 transition-colors cursor-default">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 transition-transform group-hover:scale-110" />
              Alerts
            </span>
          </div>

          {/* Timeframe selector */}
          <div className="relative inline-flex items-center">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300 text-xs font-semibold text-slate-700 transition-all duration-200 active:scale-95">
              <span>Last 24 hours</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 group-hover:translate-y-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas with Grid & Polished Empty State */}
      <div className="relative h-60 sm:h-64 w-full rounded-2xl bg-gradient-to-b from-slate-50/50 to-transparent p-4 border border-dashed border-slate-200/80 flex flex-col justify-between overflow-hidden">
        {/* Horizontal Grid lines with Y-axis markers */}
        <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none">
          {yAxisMarkers.map((marker, index) => (
            <div key={marker} className="flex items-center gap-3 w-full">
              <span className="text-[10px] font-mono text-slate-400 w-5 text-right">
                {marker}
              </span>
              <div
                className={`flex-1 border-b ${
                  index === yAxisMarkers.length - 1
                    ? "border-slate-300"
                    : "border-slate-100 border-dashed"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Centered Empty State with Radar Wave Animation */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center px-4 py-4">
          <div className="relative flex items-center justify-center mb-3">
            <span className="absolute w-12 h-12 rounded-2xl bg-purple-200/50 animate-radar-ring pointer-events-none" />
            <div className="relative w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-xs border border-purple-100 transition-transform duration-300 hover:scale-105">
              <BarChart2 className="w-6 h-6 stroke-[1.8]" />
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-800">
            No event data yet
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-3.5">
            Connect a log source or upload a log file to begin telemetry analysis.
          </p>
          <button
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-all duration-200 hover:shadow-xs active:scale-95"
          >
            <UploadCloud className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
            <span>Upload Logs</span>
          </button>
        </div>

        {/* X-axis markers at bottom */}
        <div className="relative z-10 flex justify-between pl-6 sm:pl-8 pr-2 pt-2 border-t border-transparent text-[9px] sm:text-[10px] font-mono text-slate-400">
          {xAxisMarkers.map((time) => (
            <span key={time}>{time}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
