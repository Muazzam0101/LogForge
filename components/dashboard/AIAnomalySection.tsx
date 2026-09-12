"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Activity,
  Cpu,
  Zap,
} from "lucide-react";
import {
  AnomalySummaryResponse,
  AnomalyListItem,
  AnomalyListResponse,
} from "@/lib/api/types";
import { ulpfApi } from "@/lib/api/ulpf";

interface AIAnomalySectionProps {
  onEventSelect?: (eventId: string) => void;
}

export function AIAnomalySection({ onEventSelect }: AIAnomalySectionProps) {
  const [summary, setSummary] = useState<AnomalySummaryResponse | null>(null);
  const [recentAnomalies, setRecentAnomalies] = useState<AnomalyListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainStatus, setTrainStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchAnomalyData = async () => {
    try {
      setIsLoading(true);
      const [sumRes, anomRes] = await Promise.allSettled([
        ulpfApi.getAnomalySummary(),
        ulpfApi.getAnomalies({ page: 1, pageSize: 5, minScore: 0.4 }),
      ]);

      if (sumRes.status === "fulfilled") {
        setSummary(sumRes.value);
      }
      if (anomRes.status === "fulfilled") {
        setRecentAnomalies(anomRes.value.items || []);
      }
    } catch (err) {
      console.error("Failed to load anomaly data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalyData();
  }, []);

  const handleRetrain = async () => {
    try {
      setIsTraining(true);
      setTrainStatus(null);
      const res = await ulpfApi.trainModel({
        contamination: 0.1,
        max_samples: 50000,
        rescore_existing: true,
      });

      setTrainStatus({
        type: "success",
        message: `Model trained on ${res.events_trained} events (${res.anomalies_scored} scored).`,
      });
      await fetchAnomalyData();
    } catch (err: any) {
      setTrainStatus({
        type: "error",
        message: err.message || "Model training failed.",
      });
    } finally {
      setIsTraining(false);
      setTimeout(() => setTrainStatus(null), 6000);
    }
  };

  const total = summary?.total_scored_events || 0;
  const normalCount = summary?.normal_count || 0;
  const suspiciousCount = summary?.suspicious_count || 0;
  const highlyAnomalousCount = summary?.highly_anomalous_count || 0;

  const normalPct = total > 0 ? Math.round((normalCount / total) * 100) : 0;
  const suspiciousPct = total > 0 ? Math.round((suspiciousCount / total) * 100) : 0;
  const highPct = total > 0 ? Math.round((highlyAnomalousCount / total) * 100) : 0;

  return (
    <section className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600 shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                AI/ML Anomaly Intelligence
              </h2>
              {summary?.is_trained ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Isolation Forest {summary.model_version}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Model Untrained
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Unsupervised statistical outlier scoring across 14 normalized network &amp; temporal dimensions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRetrain}
            disabled={isTraining}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTraining ? "animate-spin" : ""}`} />
            <span>{isTraining ? "Calibrating Model..." : "Retrain Model"}</span>
          </button>
        </div>
      </div>

      {/* Train Notification Toast */}
      {trainStatus && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center justify-between border ${
            trainStatus.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {trainStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{trainStatus.message}</span>
          </div>
          <button
            onClick={() => setTrainStatus(null)}
            className="text-xs underline opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scored Events */}
        <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
              Scored Logs
            </span>
            <Cpu className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {isLoading ? "--" : total.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              Avg Score: {isLoading ? "--" : (summary?.average_anomaly_score ?? 0).toFixed(3)}
            </div>
          </div>
        </div>

        {/* Normal Baseline */}
        <div className="bg-emerald-50/40 border border-emerald-100/80 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider text-[11px]">
              Normal Baseline
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-900 tracking-tight">
              {isLoading ? "--" : normalCount.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-700 mt-0.5">
              {normalPct}% of events within baseline
            </div>
          </div>
        </div>

        {/* Suspicious Events */}
        <div className="bg-amber-50/40 border border-amber-100/80 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider text-[11px]">
              Suspicious
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-900 tracking-tight">
              {isLoading ? "--" : suspiciousCount.toLocaleString()}
            </div>
            <div className="text-xs text-amber-700 mt-0.5">
              {suspiciousPct}% score between 0.40 – 0.69
            </div>
          </div>
        </div>

        {/* Highly Anomalous */}
        <div className="bg-rose-50/40 border border-rose-100/80 rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider text-[11px]">
              Highly Anomalous
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-rose-900 tracking-tight">
              {isLoading ? "--" : highlyAnomalousCount.toLocaleString()}
            </div>
            <div className="text-xs text-rose-700 mt-0.5">
              {highPct}% score &gt;= 0.70 outlier threshold
            </div>
          </div>
        </div>
      </div>

      {/* Deep-Dive Grid: Top Anomalous Sources + Recent Anomaly Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
        {/* Top Anomalous Sources Table */}
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-100 p-5 bg-slate-50/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Top Flagged Sources
                </h3>
                <p className="text-xs text-slate-500">
                  IPs with highest anomaly prevalence
                </p>
              </div>
              <Link
                href="/explorer"
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <span>Filter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Source IP</th>
                    <th className="py-2.5 px-2 text-right">Anomalies</th>
                    <th className="py-2.5 px-3 text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="py-3 px-3"><div className="h-3 w-20 bg-slate-200 rounded" /></td>
                        <td className="py-3 px-2 text-right"><div className="h-3 w-8 bg-slate-200 rounded ml-auto" /></td>
                        <td className="py-3 px-3 text-right"><div className="h-3 w-10 bg-slate-200 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : (summary?.top_anomalous_sources || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                        No anomalous sources detected
                      </td>
                    </tr>
                  ) : (
                    (summary?.top_anomalous_sources || []).slice(0, 5).map((src) => (
                      <tr key={src.source_ip} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] font-medium text-slate-800">
                          <Link
                            href={`/explorer?source_ip=${encodeURIComponent(src.source_ip)}`}
                            className="hover:text-purple-600 transition-colors"
                          >
                            {src.source_ip}
                          </Link>
                        </td>
                        <td className="py-2.5 px-2 text-right font-semibold text-slate-700">
                          {src.count}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                              src.avg_score >= 0.7
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {src.avg_score.toFixed(3)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Model Contamination: 10%</span>
            <span>Dimensions: 14 Features</span>
          </div>
        </div>

        {/* Explainable Anomaly Feed */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-100 p-5 bg-slate-50/30">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Explainable Anomaly Stream
                </h3>
                <p className="text-xs text-slate-500">
                  Plain-English justification of feature deviations
                </p>
              </div>
              <Link
                href="/explorer"
                className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <span>View in Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-3 border border-slate-100 animate-pulse space-y-2">
                    <div className="h-3 w-40 bg-slate-200 rounded" />
                    <div className="h-3 w-full bg-slate-100 rounded" />
                  </div>
                ))
              ) : recentAnomalies.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center border border-slate-100 text-slate-400 text-xs">
                  No anomalous events flagged above baseline threshold.
                </div>
              ) : (
                recentAnomalies.slice(0, 3).map((item) => (
                  <div
                    key={item.event_id}
                    onClick={() => onEventSelect && onEventSelect(item.event_id)}
                    className="bg-white rounded-xl p-3.5 border border-slate-100 hover:border-purple-200 hover:shadow-xs transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 font-semibold">
                        <span>{item.source_ip || "unknown"}</span>
                        <span className="text-slate-300">→</span>
                        <span>{item.destination_ip || "unknown"}</span>
                        {item.destination_port && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            :{item.destination_port}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.classification === "Highly Anomalous"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {item.classification}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          {item.anomaly_score.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.explanation}
                    </p>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                      <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                      <span className="group-hover:text-purple-600 transition-colors flex items-center gap-0.5 font-medium">
                        Inspect event details <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Thresholds: Normal (&lt;0.40) · Suspicious (0.40–0.69) · Highly Anomalous (≥0.70)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
