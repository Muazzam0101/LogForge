"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PipelineHero } from "@/components/dashboard/PipelineHero";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { EventTrend } from "@/components/dashboard/EventTrend";
import { LogSources } from "@/components/dashboard/LogSources";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import { SecurityAlerts } from "@/components/dashboard/SecurityAlerts";
import { AIAnomalySection } from "@/components/dashboard/AIAnomalySection";
import { ProcessingHealth } from "@/components/dashboard/ProcessingHealth";
import { EventDetailModal } from "@/components/explorer/EventDetailModal";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";
import { ulpfApi, UlpfApiError } from "@/lib/api/ulpf";
import {
  AnalyticsOverview,
  HealthResponse,
  StoredEventDetail,
  StoredEventSummary,
} from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { openUploadModal, openExploreModal, openAddSourceModal } = useModals();

  // Operational Analytics & Health State
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [recentEvents, setRecentEvents] = useState<StoredEventSummary[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [timeRange, setTimeRange] = useState<string>("24h");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Modal inspection state for Recent Events
  const [activeEventDetail, setActiveEventDetail] = useState<StoredEventDetail | null>(null);

  // Fetch all live dashboard telemetry from FastAPI
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      const [overviewData, logsData, healthData] = await Promise.allSettled([
        ulpfApi.getAnalyticsOverview(timeRange),
        ulpfApi.getLogs({ limit: 5 }),
        ulpfApi.checkHealth(),
      ]);

      if (overviewData.status === "fulfilled") {
        setOverview(overviewData.value);
      } else {
        console.error("Failed to load analytics overview", overviewData.reason);
      }

      if (logsData.status === "fulfilled") {
        setRecentEvents(logsData.value.events);
      }

      if (healthData.status === "fulfilled") {
        setHealth(healthData.value);
      }

      setLastUpdated(new Date());
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        setError(`[${err.code}] ${err.message}`);
      } else {
        setError("Unable to connect to the persistent database. Verify that FastAPI is running at http://127.0.0.1:8000.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle event inspection from Recent Events
  const handleInspectEvent = async (eventId: string) => {
    try {
      const detail = await ulpfApi.getLogById(eventId);
      setActiveEventDetail(detail);
    } catch (err: unknown) {
      if (err instanceof UlpfApiError) {
        alert(`Failed to load event: ${err.message}`);
      }
    }
  };

  const summary = overview?.summary || null;
  const distributions = overview?.distributions || null;
  const trends = overview?.trends || [];
  const totalEvents = summary?.total_events || 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Backend Communication Warning: </span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Greeting Header with Refresh Button */}
      <ScrollReveal direction="up" delay={50} duration={600}>
        <DashboardHeader
          onRefresh={() => loadDashboardData(true)}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />
      </ScrollReveal>

      {/* Hero Section & System Status Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <ScrollReveal direction="up" delay={120} duration={600} className="xl:col-span-8 h-full">
          <PipelineHero
            onUploadClick={openUploadModal}
            onExploreClick={openExploreModal}
          />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={200} duration={600} className="xl:col-span-4 h-full">
          <SystemStatus health={health} isLoading={isLoading} />
        </ScrollReveal>
      </div>

      {/* 4 Real KPI Metric Cards */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <MetricCards summary={summary} isLoading={isLoading} />
      </ScrollReveal>

      {/* AI/ML Anomaly Intelligence Layer */}
      <ScrollReveal direction="up" delay={160} duration={600}>
        <AIAnomalySection onEventSelect={handleInspectEvent} />
      </ScrollReveal>


      {/* Middle Section: Real Event Trends + Real Log Distributions */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        <ScrollReveal direction="up" delay={100} duration={600} className="xl:col-span-8">
          <EventTrend
            trends={trends}
            isLoading={isLoading}
            timeRange={timeRange}
            onTimeRangeChange={(range) => setTimeRange(range)}
            onUploadClick={openUploadModal}
          />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={180} duration={600} className="xl:col-span-4">
          <LogSources
            distributions={distributions}
            isLoading={isLoading}
            totalEvents={totalEvents}
          />
        </ScrollReveal>
      </div>

      {/* Bottom Section: Real Recent Events + Real Severity Telemetry */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        <ScrollReveal direction="up" delay={100} duration={600} className="xl:col-span-8">
          <RecentEvents
            events={recentEvents}
            isLoading={isLoading}
            onInspectEvent={handleInspectEvent}
          />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={180} duration={600} className="xl:col-span-4">
          <SecurityAlerts
            summary={summary}
            isLoading={isLoading}
          />
        </ScrollReveal>
      </div>

      {/* Processing Health Section */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="space-y-2">
          <div className="px-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Engine Processing & Parsing Health
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Deterministic Parser Telemetry
            </span>
          </div>
          <ProcessingHealth
            summary={summary}
            health={health}
            isLoading={isLoading}
          />
        </div>
      </ScrollReveal>

      {/* Event Details Inspection Modal for Recent Events */}
      <EventDetailModal
        event={activeEventDetail}
        onClose={() => setActiveEventDetail(null)}
      />
    </div>
  );
}
