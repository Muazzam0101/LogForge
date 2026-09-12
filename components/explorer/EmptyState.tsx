"use client";

import React from "react";
import { Terminal, SearchX, RotateCcw, ArrowDownToLine } from "lucide-react";

interface EmptyStateProps {
  isFiltered: boolean;
  onClearFilters: () => void;
  onOpenUpload: () => void;
}

export function EmptyState({
  isFiltered,
  onClearFilters,
  onOpenUpload,
}: EmptyStateProps) {
  if (isFiltered) {
    return (
      <div className="p-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
          <SearchX className="w-7 h-7 stroke-[1.8]" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-800">
            No matching events found
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No persistent logs match the current search query or applied filter criteria. Try adjusting your parameters or resetting filters.
          </p>
        </div>
        <div>
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      </div>
    );
  }

  // Pure Empty State (Requirement 1 & 16)
  return (
    <div className="p-16 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto border border-slate-200">
        <Terminal className="w-7 h-7 stroke-[1.8]" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-extrabold text-slate-800">
          No events processed yet.
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Process a log through Log Ingestion to see events here.
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={onOpenUpload}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
          <span>Upload Logs to Ingest</span>
        </button>
      </div>
    </div>
  );
}
