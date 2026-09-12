"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Brain, ArrowRight, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import { AnomalySummaryResponse } from "@/lib/api/types";
import { ulpfApi } from "@/lib/api/ulpf";

interface AIAnomalyGaugeCardProps {
  onInspectEvent?: (eventId: string) => void;
}

export function AIAnomalyGaugeCard({ onInspectEvent }: AIAnomalyGaugeCardProps) {
  const [summary, setSummary] = useState<AnomalySummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainToast, setTrainToast] = useState<string | null>(null);

  const fetchAnomalyData = async () => {
    try {
      setIsLoading(true);
      const sumRes = await ulpfApi.getAnomalySummary();
      setSummary(sumRes);
    } catch (err) {
      console.error("Failed to load anomaly gauge:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalyData();
  }, []);

  const handleRetrain = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsTraining(true);
      const res = await ulpfApi.trainModel({
        contamination: 0.1,
        max_samples: 50000,
        rescore_existing: true,
      });
      setTrainToast(`Model calibrated on ${res.events_trained} logs!`);
      await fetchAnomalyData();
    } catch (err: any) {
      setTrainToast(err.message || "Retrain failed.");
    } finally {
      setIsTraining(false);
      setTimeout(() => setTrainToast(null), 4000);
    }
  };

  const totalAnomalies =
    (summary?.highly_anomalous_count || 0) + (summary?.suspicious_count || 0);
  const highlyAnomalous = summary?.highly_anomalous_count || 0;
  const suspicious = summary?.suspicious_count || 0;
  const totalScored = summary?.total_scored_events || 0;

  // Compute radial percentage (anomalies / total scored, clamped)
  const anomalyRate = totalScored > 0 ? (totalAnomalies / totalScored) * 100 : 0;
  const strokeDashoffset = 283 - (283 * Math.min(Math.max(anomalyRate, 12), 100)) / 100;

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between h-full group relative">
      {/* Toast */}
      {trainToast && (
        <div className="absolute top-3 left-4 right-4 z-20 bg-slate-900 text-white text-[11px] py-1.5 px-3 rounded-xl flex items-center justify-between shadow-lg animate-fade-in">
          <span>{trainToast}</span>
          <button
            onClick={() => setTrainToast(null)}
            className="text-slate-400 hover:text-white text-xs ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              AI Anomaly Detection
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRetrain}
            disabled={isTraining}
            title="Retrain Isolation Forest Model"
            className="p-1 rounded-md text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTraining ? "animate-spin text-orange-600" : ""}`} />
          </button>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Model Active
          </span>
        </div>
      </div>

      {/* Radial Gauge / Meter Body */}
      <div className="my-auto flex flex-col items-center justify-center py-2">
        {isLoading ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-[11px] font-mono text-slate-400">Scoring logs...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* SVG Circular Gauge */}
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="text-slate-100"
                  strokeWidth="8"
                  stroke="currentColor"
                  fill="transparent"
                />
                {/* Progress Ring with Orange/Coral gradient */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#anomalyGaugeGradient)"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="anomalyGaugeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f95738" />
                    <stop offset="100%" stopColor="#ea384d" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Brain Icon & Count */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <Brain className="w-6 h-6 text-orange-600 mb-0.5" />
                <span className="text-lg font-extrabold text-slate-900 font-mono tracking-tight leading-none">
                  {totalAnomalies}
                </span>
              </div>
            </div>

            <span className="text-[11px] font-medium text-slate-500 mt-1">
              Anomalies (24h)
            </span>

            {/* Status Pills */}
            <div className="flex items-center gap-2 mt-2.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Highly: {highlyAnomalous}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Suspicious: {suspicious}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Action Button: View Anomalies */}
      <div className="mt-2 pt-2.5 border-t border-slate-50">
        <Link
          href="/anomalies"
          className="w-full py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors group/btn"
        >
          <span>View Anomalies</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
