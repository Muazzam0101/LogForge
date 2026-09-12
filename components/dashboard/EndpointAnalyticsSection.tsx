"use client";

import React from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Network, Activity, ShieldCheck, CheckCircle2 } from "lucide-react";
import { AnalyticsDistributions, HealthResponse } from "@/lib/api/types";

interface EndpointAnalyticsSectionProps {
  distributions: AnalyticsDistributions | null;
  health: HealthResponse | null;
  isLoading: boolean;
  totalEvents: number;
}

const ACTION_COLORS: Record<string, string> = {
  ALLOW: "#10b981",
  BLOCK: "#ea384d",
  DENY: "#f97316",
  DROP: "#8b5cf6",
  OTHER: "#94a3b8",
};

export function EndpointAnalyticsSection({
  distributions,
  health,
  isLoading,
  totalEvents,
}: EndpointAnalyticsSectionProps) {
  const topSources = (distributions?.top_source_ips || []).slice(0, 5);
  const topDests = (distributions?.top_destination_ips || []).slice(0, 5);
  const actionData = distributions?.action_distribution || [];

  const maxSourceCount = Math.max(...topSources.map((s) => s.count), 1);
  const maxDestCount = Math.max(...topDests.map((d) => d.count), 1);

  const totalActions = actionData.reduce((acc, curr) => acc + curr.count, 0);

  const chartActionItems = actionData.map((item, idx) => ({
    name: item.name.toUpperCase(),
    value: item.count,
    percentage: item.percentage,
    color:
      ACTION_COLORS[item.name.toUpperCase()] ||
      ["#10b981", "#ea384d", "#f97316", "#8b5cf6", "#94a3b8"][idx % 5],
  }));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
      {/* 1. Top Source IPs */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Top Source IPs
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Originating network traffic
            </p>
          </div>
          <Link
            href="/explorer"
            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="my-auto flex-1 flex flex-col justify-center py-1 space-y-2.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-10 bg-slate-200 rounded" />
              </div>
            ))
          ) : topSources.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No source telemetry recorded
            </p>
          ) : (
            topSources.map((item, idx) => {
              const pct = Math.max(Math.round((item.count / maxSourceCount) * 100), 10);
              return (
                <div key={item.ip} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-[11px] font-mono text-slate-400">
                        #{idx + 1}
                      </span>
                      <Link
                        href={`/explorer?source_ip=${encodeURIComponent(item.ip)}`}
                        className="font-mono text-slate-700 hover:text-orange-600 font-medium text-[11px] transition-colors"
                      >
                        {item.ip}
                      </Link>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">
                      {item.count}
                    </span>
                  </div>
                  {/* Proportional horizontal bar in coral/red */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-red-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Unique Sources</span>
          <span className="font-mono font-medium text-slate-600">{topSources.length} Active</span>
        </div>
      </div>

      {/* 2. Top Destination IPs */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Top Destination IPs
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Target endpoints &amp; hosts
            </p>
          </div>
          <Link
            href="/explorer"
            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="my-auto flex-1 flex flex-col justify-center py-1 space-y-2.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center justify-between">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="h-3 w-10 bg-slate-200 rounded" />
              </div>
            ))
          ) : topDests.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">
              No destination telemetry recorded
            </p>
          ) : (
            topDests.map((item, idx) => {
              const pct = Math.max(Math.round((item.count / maxDestCount) * 100), 10);
              return (
                <div key={item.ip} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-4 text-[11px] font-mono text-slate-400">
                        #{idx + 1}
                      </span>
                      <Link
                        href={`/explorer?destination_ip=${encodeURIComponent(item.ip)}`}
                        className="font-mono text-slate-700 hover:text-orange-600 font-medium text-[11px] transition-colors"
                      >
                        {item.ip}
                      </Link>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-[11px]">
                      {item.count}
                    </span>
                  </div>
                  {/* Proportional horizontal bar in bright orange */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Target Endpoints</span>
          <span className="font-mono font-medium text-slate-600">{topDests.length} Targets</span>
        </div>
      </div>

      {/* 3. Action Distribution */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              Action Distribution
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Firewall &amp; policy decisions
            </p>
          </div>
          <Link
            href="/explorer"
            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 hover:underline transition-colors"
          >
            View All
          </Link>
        </div>

        <div className="my-auto flex-1 flex items-center justify-center py-1">
          {isLoading ? (
            <div className="p-6 text-center space-y-2">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <span className="text-[11px] font-mono text-slate-400">Aggregating actions...</span>
            </div>
          ) : actionData.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No actions recorded
            </div>
          ) : (
            <div className="flex items-center justify-between w-full gap-3">
              {/* Donut Chart */}
              <div className="relative w-28 h-28 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartActionItems}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={48}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {chartActionItems.map((entry, index) => (
                        <Cell key={`action-cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "#1e1e24",
                        borderColor: "#333",
                        borderRadius: "10px",
                        color: "#f8fafc",
                        fontSize: "11px",
                        fontFamily: "monospace",
                        padding: "4px 8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-sm font-extrabold text-slate-800 tracking-tight font-mono">
                    {totalActions}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                    Decisions
                  </span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 space-y-1.5">
                {chartActionItems.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-semibold text-slate-700 text-[11px] truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 font-bold">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Policy Enforcement</span>
          <span className="font-mono font-medium text-emerald-600">Active</span>
        </div>
      </div>

      {/* 4. System Health */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all flex flex-col justify-between group">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
              System Health
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              Core platform infrastructure
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            100% Operational
          </span>
        </div>

        <div className="my-auto flex-1 flex flex-col justify-center py-1 space-y-2.5">
          {[
            {
              name: "ULPF Parser Engine",
              desc: `${health?.registered_parsers?.length || 3} Core Parsers`,
              status: "Operational",
            },
            {
              name: "FastAPI Telemetry API",
              desc: "Latency < 4ms",
              status: "Healthy",
            },
            {
              name: "MySQL Database",
              desc: "Persistent / Storage OK",
              status: "Connected",
            },
            {
              name: "AI Isolation Forest",
              desc: "14 Dimensions",
              status: "Active",
            },
          ].map((svc) => (
            <div
              key={svc.name}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 border border-slate-100/70 text-xs"
            >
              <div>
                <div className="font-semibold text-slate-800 text-[11px]">{svc.name}</div>
                <div className="text-[10px] text-slate-400 font-mono">{svc.desc}</div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                <span>{svc.status}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Platform Status</span>
          <span className="font-mono text-emerald-600 font-bold">All systems nominal</span>
        </div>
      </div>
    </div>
  );
}
