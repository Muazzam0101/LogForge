"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { EventTrend } from "@/components/dashboard/EventTrend";
import { LogSources } from "@/components/dashboard/LogSources";
import { SeverityDistributionChart } from "@/components/dashboard/SeverityDistributionChart";
import { AIAnomalyGaugeCard } from "@/components/dashboard/AIAnomalyGaugeCard";
import { EndpointAnalyticsSection } from "@/components/dashboard/EndpointAnalyticsSection";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import { ThreatsPromoCard } from "@/components/dashboard/ThreatsPromoCard";
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
  const { openUploadModal } = useModals();

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
        ulpfApi.getLogs({ limit: 10 }),
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
    <div className="space-y-5 sm:space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Backend Communication Warning: </span>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            className="text-xs font-semibold text-red-700 hover:text-red-900 underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Dashboard Greeting Header with Timeframe Pill & Refresh */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <DashboardHeader
          onRefresh={() => loadDashboardData(true)}
          isRefreshing={isRefreshing}
          lastUpdated={lastUpdated}
        />
      </ScrollReveal>

      {/* ROW 1: 5 Real KPI Metric Cards */}
      <ScrollReveal direction="up" delay={100} duration={500}>
        <MetricCards summary={summary} isLoading={isLoading} />
      </ScrollReveal>

      {/* ROW 2: 4 Core Visualization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5 items-stretch">
        {/* 1. Event Volume Area Spline */}
        <ScrollReveal direction="up" delay={120} duration={500} className="h-full">
          <EventTrend
            trends={trends}
            isLoading={isLoading}
            timeRange={timeRange}
            onTimeRangeChange={(range) => setTimeRange(range)}
            onUploadClick={openUploadModal}
          />
        </ScrollReveal>

        {/* 2. Event Format Distribution Donut */}
        <ScrollReveal direction="up" delay={140} duration={500} className="h-full">
          <LogSources
            distributions={distributions}
            isLoading={isLoading}
            totalEvents={totalEvents}
          />
        </ScrollReveal>

        {/* 3. Severity Distribution Vertical Bars */}
        <ScrollReveal direction="up" delay={160} duration={500} className="h-full">
          <SeverityDistributionChart
            severityDistribution={distributions?.severity_distribution || null}
            isLoading={isLoading}
            totalEvents={totalEvents}
          />
        </ScrollReveal>

        {/* 4. AI Anomaly Detection Radial Gauge Meter */}
        <ScrollReveal direction="up" delay={180} duration={500} className="h-full">
          <AIAnomalyGaugeCard onInspectEvent={handleInspectEvent} />
        </ScrollReveal>
      </div>

      {/* ROW 3: 4 Endpoint Analytics & Health Cards */}
      <ScrollReveal direction="up" delay={200} duration={500}>
        <EndpointAnalyticsSection
          distributions={distributions}
          health={health}
          isLoading={isLoading}
          totalEvents={totalEvents}
        />
      </ScrollReveal>

      {/* ROW 4: Wide Recent Events Table + Threats Promo Card */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-5 items-stretch">
        <ScrollReveal direction="up" delay={220} duration={500} className="xl:col-span-8 2xl:col-span-9 h-full">
          <RecentEvents
            events={recentEvents}
            isLoading={isLoading}
            onInspectEvent={handleInspectEvent}
          />
        </ScrollReveal>

        <ScrollReveal direction="up" delay={240} duration={500} className="xl:col-span-4 2xl:col-span-3 h-full">
          <ThreatsPromoCard />
        </ScrollReveal>
      </div>

      {/* Event Details Inspection Modal */}
      <EventDetailModal
        event={activeEventDetail}
        onClose={() => setActiveEventDetail(null)}
      />
    </div>
  );
}

