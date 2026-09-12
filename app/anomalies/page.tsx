"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Brain,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  Filter,
  Search,
  CheckCircle2,
  Lock,
  Cpu,
  TrendingUp,
  Sliders,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  AnomalySummaryResponse,
  AnomalyListItem,
  ModelStatusResponse,
  StoredEventDetail,
} from "@/lib/api/types";
import { ulpfApi } from "@/lib/api/ulpf";
import { EventDetailModal } from "@/components/explorer/EventDetailModal";

const PAGE_SIZE = 15;

export default function AnomaliesPage() {
  const [summary, setSummary] = useState<AnomalySummaryResponse | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyListItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [selectedClassification, setSelectedClassification] = useState<
    "all_anomalies" | "Highly Anomalous" | "Suspicious" | "Normal" | "all"
  >("all_anomalies");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainStatus, setTrainStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal inspection state
  const [activeEventDetail, setActiveEventDetail] = useState<StoredEventDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Fetch telemetry summary & model status
  const fetchTelemetry = useCallback(async () => {
    try {
      const [sumRes, statRes] = await Promise.allSettled([
        ulpfApi.getAnomalySummary(),
        ulpfApi.getModelStatus(),
      ]);
      if (sumRes.status === "fulfilled") setSummary(sumRes.value);
      if (statRes.status === "fulfilled") setModelStatus(statRes.value);
    } catch (err) {
      console.error("Failed to load anomaly telemetry:", err);
    }
  }, []);

  // Fetch paginated anomaly records
  const fetchAnomalies = useCallback(async () => {
    try {
      setIsLoading(true);

      let classificationParam: string | undefined = undefined;
      let minScoreParam: number | undefined = undefined;

      if (selectedClassification === "all_anomalies") {
        minScoreParam = 0.4;
      } else if (selectedClassification === "Highly Anomalous") {
        classificationParam = "Highly Anomalous";
      } else if (selectedClassification === "Suspicious") {
        classificationParam = "Suspicious";
      } else if (selectedClassification === "Normal") {
        classificationParam = "Normal";
      }

      const res = await ulpfApi.getAnomalies({
        page,
        pageSize: PAGE_SIZE,
        classification: classificationParam,
        minScore: minScoreParam,
      });

      setAnomalies(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error("Failed to fetch anomaly records:", err);
      setAnomalies([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedClassification]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  useEffect(() => {
    fetchAnomalies();
  }, [fetchAnomalies]);

  // Model retraining handler
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
        message: `Model trained on ${res.events_trained} events (${res.anomalies_scored} scored in database).`,
      });
      await Promise.all([fetchTelemetry(), fetchAnomalies()]);
    } catch (err: any) {
      setTrainStatus({
        type: "error",
        message: err.message || "Model training failed.",
      });
    } finally {
      setIsTraining(false);
      setTimeout(() => setTrainStatus(null), 8000);
    }
  };

  // Inspect event detail
  const handleInspect = async (eventId: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await ulpfApi.getLogById(eventId);
      setActiveEventDetail(detail);
    } catch (err) {
      console.error("Failed to load event details:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Filter anomalies by search query on frontend for instant search
  const filteredAnomalies = anomalies.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.source_ip && item.source_ip.toLowerCase().includes(q)) ||
      (item.destination_ip && item.destination_ip.toLowerCase().includes(q)) ||
      (item.protocol && item.protocol.toLowerCase().includes(q)) ||
      (item.action && item.action.toLowerCase().includes(q)) ||
      (item.explanation && item.explanation.toLowerCase().includes(q)) ||
      item.event_id.toLowerCase().includes(q)
    );
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-700 text-xs font-semibold">
              <Brain className="w-3.5 h-3.5 text-orange-600" />
              <span>Isolation Forest ML Engine</span>
              <span className="text-slate-300">·</span>
              <span className="font-mono text-[11px] text-orange-800">
                {modelStatus?.model_name || "isolation_forest_v1"}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              AI Anomaly Detection
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Unsupervised machine learning stream analyzing 14-dimensional network flow vectors to identify and explain behavioral outliers in real time.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => {
                fetchTelemetry();
                fetchAnomalies();
              }}
              className="p-2.5 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleRetrain}
              disabled={isTraining}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isTraining ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Calibrating Engine...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Retrain Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Retrain Alert Notification */}
      {trainStatus && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            trainStatus.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {trainStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{trainStatus.message}</span>
          </div>
          <button
            onClick={() => setTrainStatus(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Telemetry Cards */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Scored */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Scored
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900">
              {summary?.total_scored_events?.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-slate-400 block">Evaluated events</span>
          </div>

          {/* Card 2: Highly Anomalous */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">
                Highly Anomalous
              </span>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-rose-700">
              {summary?.highly_anomalous_count?.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">Score ≥ 0.70</span>
          </div>

          {/* Card 3: Suspicious */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                Suspicious Outliers
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-amber-700">
              {summary?.suspicious_count?.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">0.40 – 0.69</span>
          </div>

          {/* Card 4: Normal Baseline */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                Normal Baseline
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-700">
              {summary?.normal_count?.toLocaleString() || 0}
            </div>
            <span className="text-[11px] text-slate-400 block font-mono">Score &lt; 0.40</span>
          </div>

          {/* Card 5: Average Anomaly Score */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-1 col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Average Score
            </span>
            <div className="text-xl sm:text-2xl font-extrabold font-mono text-orange-600">
              {(summary?.average_anomaly_score || 0).toFixed(3)}
            </div>
            <span className="text-[11px] text-slate-400 block">Fleet baseline mean</span>
          </div>
        </div>
      </ScrollReveal>

      {/* Filter Toolbar & Search */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Classification Triage Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              {
                id: "all_anomalies",
                label: "All Anomalies",
                count: (summary?.highly_anomalous_count || 0) + (summary?.suspicious_count || 0),
              },
              {
                id: "Highly Anomalous",
                label: "Highly Anomalous",
                count: summary?.highly_anomalous_count || 0,
              },
              {
                id: "Suspicious",
                label: "Suspicious",
                count: summary?.suspicious_count || 0,
              },
              {
                id: "Normal",
                label: "Normal Baseline",
                count: summary?.normal_count || 0,
              },
              {
                id: "all",
                label: "All Scored",
                count: summary?.total_scored_events || 0,
              },
            ].map((tab) => {
              const isActive = selectedClassification === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setSelectedClassification(tab.id as any);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-orange-600 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IP, protocol, action, explanation..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-hidden focus:bg-white focus:border-orange-500 transition-colors"
            />
          </div>
        </div>
      </ScrollReveal>

      {/* Anomalies Data Table */}
      <ScrollReveal direction="up" delay={200} duration={600}>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Score & Tier</th>
                  <th className="py-3 px-4">Network Telemetry (Flow)</th>
                  <th className="py-3 px-4">Action & Protocol</th>
                  <th className="py-3 px-4">AI Feature Explainability Justification</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-36 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-20 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-64 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-20 bg-slate-200 rounded" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="h-4 w-16 bg-slate-200 rounded ml-auto" />
                      </td>
                    </tr>
                  ))
                ) : filteredAnomalies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                          <Brain className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">
                          No anomalous events match filter
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          All scored logs are within calibrated statistical normal boundaries, or no events meet the selected triage classification.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAnomalies.map((item) => {
                    const isHigh = item.classification === "Highly Anomalous";
                    const isSuspicious = item.classification === "Suspicious";

                    return (
                      <tr
                        key={item.event_id}
                        onClick={() => handleInspect(item.event_id)}
                        className="hover:bg-orange-50/20 transition-colors cursor-pointer group"
                      >
                        {/* Score & Tier */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                                isHigh
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : isSuspicious
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              {item.classification}
                            </span>
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {item.anomaly_score.toFixed(3)}
                            </span>
                          </div>
                        </td>

                        {/* Network Telemetry Flow */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800">
                            <span className="font-semibold text-slate-900">
                              {item.source_ip || "Not Detected"}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="font-semibold text-slate-900">
                              {item.destination_ip || "Not Detected"}
                            </span>
                            {item.destination_port && (
                              <span className="text-[11px] text-slate-400 font-normal">
                                :{item.destination_port}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action & Protocol */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {item.protocol && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px] font-bold uppercase">
                                {item.protocol}
                              </span>
                            )}
                            {item.action && (
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  item.action.toLowerCase().includes("allow")
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {item.action}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* AI Feature Explainability */}
                        <td className="py-3.5 px-4 max-w-md">
                          <div className="flex items-start gap-1.5 text-xs text-slate-700">
                            <Sparkles className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed">
                              {item.explanation || "Evaluated by local unsupervised Isolation Forest."}
                            </span>
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {new Date(item.created_at).toLocaleString()}
                        </td>

                        {/* Inspect Button */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspect(item.event_id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 group-hover:text-orange-700 group-hover:underline cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing page <strong className="text-slate-800">{page}</strong> of{" "}
                <strong className="text-slate-800">{totalPages}</strong> ({totalCount} total scored records)
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Forensic Inspection Modal */}
      {activeEventDetail && (
        <EventDetailModal
          event={activeEventDetail}
          onClose={() => setActiveEventDetail(null)}
        />
      )}
    </div>
  );
}
