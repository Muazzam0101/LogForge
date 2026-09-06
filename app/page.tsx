"use client";

import React from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PipelineHero } from "@/components/dashboard/PipelineHero";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { EventTrend } from "@/components/dashboard/EventTrend";
import { LogSources } from "@/components/dashboard/LogSources";
import { RecentEvents } from "@/components/dashboard/RecentEvents";
import { SecurityAlerts } from "@/components/dashboard/SecurityAlerts";
import { ProcessingHealth } from "@/components/dashboard/ProcessingHealth";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";

export default function DashboardPage() {
  const { openUploadModal, openExploreModal, openAddSourceModal } = useModals();

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Dashboard Greeting Header with Scroll Reveal */}
      <ScrollReveal direction="up" delay={50} duration={600}>
        <DashboardHeader />
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
          <SystemStatus />
        </ScrollReveal>
      </div>

      {/* 4 Key Metrics Cards with Staggered Scroll Reveal */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <MetricCards />
      </ScrollReveal>

      {/* Middle Section: Event Trends + Log Sources */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        <ScrollReveal direction="up" delay={100} duration={600} className="xl:col-span-8">
          <EventTrend onUploadClick={openUploadModal} />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={180} duration={600} className="xl:col-span-4">
          <LogSources onAddSourceClick={openAddSourceModal} />
        </ScrollReveal>
      </div>

      {/* Bottom Section: Recent Events + Top Security Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 sm:gap-6">
        <ScrollReveal direction="up" delay={100} duration={600} className="xl:col-span-8">
          <RecentEvents />
        </ScrollReveal>
        <ScrollReveal direction="up" delay={180} duration={600} className="xl:col-span-4">
          <SecurityAlerts />
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
              Deterministic Parser Metrics
            </span>
          </div>
          <ProcessingHealth />
        </div>
      </ScrollReveal>
    </div>
  );
}
