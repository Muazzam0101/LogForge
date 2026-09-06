"use client";

import React from "react";
import { ArrowRight, Plus } from "lucide-react";

interface LogSourcesProps {
  onAddSourceClick?: () => void;
}

const sourceCategories = [
  { name: "Firewall", color: "bg-purple-500" },
  { name: "Router", color: "bg-indigo-500" },
  { name: "Windows", color: "bg-blue-500" },
  { name: "Linux", color: "bg-pink-500" },
  { name: "IDS/IPS", color: "bg-amber-500" },
  { name: "Application", color: "bg-emerald-500" },
  { name: "Cloud", color: "bg-cyan-500" },
  { name: "Others", color: "bg-slate-400" },
];

export function LogSources({ onAddSourceClick }: LogSourcesProps) {
  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between group">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base tracking-tight">
            Log Sources
          </h3>
          <p className="text-xs font-medium text-slate-400 mt-0.5">
            Connected device and event sources
          </p>
        </div>

        <button className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 group/btn transition-colors">
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform duration-200" />
        </button>
      </div>

      {/* Donut Chart Visual & Empty State */}
      <div className="my-2 flex flex-col sm:flex-row items-center justify-center gap-6">
        {/* Sleek Dashed Circular Donut with Subtle Slow Rotation */}
        <div className="relative w-36 h-36 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
          <svg className="w-full h-full transform -rotate-90 animate-spin-slow" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#f1f5f9"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Dashed placeholder ring */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#cbd5e1"
              strokeWidth="10"
              strokeDasharray="4 6"
              fill="transparent"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-2xl font-extrabold text-slate-800 tracking-tight transition-transform duration-300">
              --
            </span>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Sources
            </span>
          </div>
        </div>

        {/* Source Categories with Colors */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          {sourceCategories.map((cat) => (
            <div
              key={cat.name}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-50 transition-colors cursor-default"
            >
              <span className={`w-2 h-2 rounded-full ${cat.color} shrink-0 transition-transform group-hover:scale-125`} />
              <span className="text-slate-600 hover:text-slate-900 font-medium text-xs truncate transition-colors">
                {cat.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State Banner & Add Source CTA */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-slate-300" />
          <span className="font-medium">No log sources connected</span>
        </div>

        <button
          onClick={onAddSourceClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold border border-purple-200 transition-all duration-200 hover:shadow-xs active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90 duration-200" />
          <span>Add Source</span>
        </button>
      </div>
    </div>
  );
}
