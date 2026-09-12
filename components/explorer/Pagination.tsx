"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  page: number; // 0-indexed
  pageSize: number;
  totalCount: number;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  isLoading,
  onPageChange,
}: PaginationProps) {
  if (totalCount === 0) return null;

  const totalPages = Math.ceil(totalCount / pageSize);
  const startRecord = page * pageSize + 1;
  const endRecord = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="text-slate-500 font-sans">
        Showing <span className="font-bold text-slate-800">{startRecord}</span> to{" "}
        <span className="font-bold text-slate-800">{endRecord}</span> of{" "}
        <span className="font-bold text-slate-800">{totalCount.toLocaleString()}</span> events
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-mono text-[11px]">
          Page {page + 1} of {Math.max(1, totalPages)}
        </span>

        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(0)}
            disabled={page === 0 || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0 || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(page + 1 < totalPages ? page + 1 : page)}
            disabled={page + 1 >= totalPages || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={page + 1 >= totalPages || isLoading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
