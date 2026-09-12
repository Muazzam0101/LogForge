"use client";

import React from "react";
import { RefreshCw } from "lucide-react";

interface DashboardHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdated?: Date | null;
}

export function DashboardHeader({
  onRefresh,
  isRefreshing,
  lastUpdated,
}: DashboardHeaderProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-5 sm:p-6 md:p-8 shadow-xs transition-all hover:shadow-sm">
      {/* Background ambient pastel waves matching reference image */}
      <div className="absolute top-0 right-0 w-96 h-full pointer-events-none opacity-40 overflow-hidden">
        <svg
          viewBox="0 0 400 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute right-0 top-0 w-full h-full object-cover transition-transform duration-1000 ease-out"
        >
          <path
            d="M50 0C140 30 200 120 400 40V0H50Z"
            fill="url(#ambientGradient1)"
          />
          <path
            d="M0 0C100 70 240 40 400 90V0H0Z"
            fill="url(#ambientGradient2)"
            fillOpacity="0.5"
          />
          <defs>
            <linearGradient id="ambientGradient1" x1="200" y1="0" x2="400" y2="100" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e0e7ff" />
              <stop offset="1" stopColor="#ede9fe" />
            </linearGradient>
            <linearGradient id="ambientGradient2" x1="0" y1="0" x2="300" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f5f3ff" />
              <stop offset="1" stopColor="#e0e7ff" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left Welcome Area */}
        <div className="space-y-1">
          <p className="text-xs md:text-sm font-medium text-slate-500">
            Good to see you again,
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Mohammed <span className="animate-wave text-2xl select-none cursor-default">👋</span>
          </h1>
          <p className="text-xs md:text-sm font-medium text-purple-600/90 pt-0.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="hover:text-purple-800 transition-colors">Ingest</span>
            <span className="text-slate-300 select-none">·</span>
            <span className="hover:text-purple-800 transition-colors">Normalize</span>
            <span className="text-slate-300 select-none">·</span>
            <span className="hover:text-purple-800 transition-colors">Preserve</span>
            <span className="text-slate-300 select-none">·</span>
            <span className="hover:text-purple-800 transition-colors">Analyze</span>
            <span className="text-slate-300 select-none">·</span>
            <span className="hover:text-purple-800 transition-colors">Secure</span>
          </p>
        </div>

        {/* Right Action & Motto Block */}
        <div className="flex flex-col md:items-end gap-2 pt-3 border-t border-slate-100 md:border-t-0 md:pt-0">
          {onRefresh && (
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[11px] font-mono text-slate-400">
                  Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              )}
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all cursor-pointer disabled:opacity-50"
                title="Refresh operational analytics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-purple-600" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          )}

          <div className="text-left md:text-right">
            <p className="text-xs md:text-sm font-medium text-slate-400">
              Different logs.
            </p>
            <p className="text-xs md:text-sm font-semibold text-slate-700">
              A unified view.
            </p>
            <p className="text-xs md:text-sm font-medium text-purple-600">
              A safer tomorrow.
            </p>
            <div className="w-12 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mt-2 ml-0 md:ml-auto transition-all duration-300 hover:w-16" />
          </div>
        </div>
      </div>
    </div>
  );
}
