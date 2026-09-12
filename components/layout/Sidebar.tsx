"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  FileSearch,
  Package,
  Brain,
  BarChart3,
  FileBarChart,
  ShieldCheck,
  CirclePlus,
  Settings,
} from "lucide-react";
import { LogForgeLogo } from "@/components/ui/LogForgeLogo";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom Dashboard Icon matching the reference image's warm coral home/screen emblem
function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M9 22V12h6v10" />
      <circle cx="12" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

interface NavItemDef {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItemDef[] = [
  { id: "dashboard", href: "/", label: "Dashboard", icon: DashboardIcon },
  { id: "explorer", href: "/explorer", label: "Logs Explorer", icon: FileSearch },
  { id: "ingestion", href: "/ingestion", label: "Log Ingestion", icon: Package },
  { id: "anomalies", href: "/anomalies", label: "AI Anomalies", icon: Brain },
  { id: "analytics", href: "/sources", label: "Analytics", icon: BarChart3 },
  { id: "reports", href: "/reports", label: "Reports", icon: FileBarChart },
  { id: "integrity", href: "/alerts", label: "Data Integrity", icon: ShieldCheck },
  { id: "health", href: "/status", label: "System Health", icon: CirclePlus },
  { id: "settings", href: "/settings", label: "Settings", icon: Settings },
];

function NavList({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const minAnomalyScore = searchParams.get("min_anomaly_score");

  // Determine strictly ONE active item ID
  const getActiveId = (): string => {
    if (!pathname || pathname === "/") return "dashboard";
    if (pathname.startsWith("/anomalies")) return "anomalies";

    if (pathname === "/explorer") {
      if (minAnomalyScore && parseFloat(minAnomalyScore) >= 0.4) {
        return "anomalies";
      }
      return "explorer";
    }

    if (pathname.startsWith("/ingestion")) return "ingestion";
    if (pathname.startsWith("/sources") || pathname.startsWith("/threats")) return "analytics";
    if (pathname.startsWith("/reports")) return "reports";
    if (pathname.startsWith("/alerts")) return "integrity";
    if (pathname.startsWith("/status")) return "health";
    if (pathname.startsWith("/settings")) return "settings";

    return "";
  };

  const activeId = getActiveId();

  return (
    <nav className="space-y-1 relative px-3 sm:px-3.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;

        return (
          <div key={item.id} className="relative">
            {/* Left indicator tab (strictly for active item) */}
            {isActive && (
              <span className="absolute -left-3 sm:-left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#ea384d] dark:bg-[#8B5CF6] rounded-r-md z-20 shadow-[0_0_8px_rgba(234,56,77,0.4)] dark:shadow-[0_0_12px_rgba(139,92,246,0.6)]" />
            )}

            <Link
              href={item.href}
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3.5 px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[13px] sm:text-[13.5px] transition-all duration-150 group cursor-pointer relative",
                isActive
                  ? "bg-[#fdeeed] dark:bg-[#8B5CF6]/15 text-[#0f172a] dark:text-[#F5F5F7] font-bold shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                  : "text-[#334155] dark:text-[#A5A7B0] hover:text-[#0f172a] dark:hover:text-[#F5F5F7] hover:bg-slate-100/60 dark:hover:bg-[#17191F] font-semibold"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0 transition-colors",
                  isActive
                    ? "text-[#ea384d] dark:text-[#8B5CF6] stroke-[2.2]"
                    : "text-[#475569] dark:text-[#A5A7B0] group-hover:text-[#0f172a] dark:group-hover:text-[#F5F5F7] stroke-[1.8]"
                )}
              />
              <span className="truncate tracking-tight leading-none">{item.label}</span>
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

function NavListFallback() {
  return (
    <nav className="space-y-1 relative px-3 sm:px-3.5">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isDashboard = item.id === "dashboard";

        return (
          <div key={item.id} className="relative">
            {isDashboard && (
              <span className="absolute -left-3 sm:-left-3.5 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#ea384d] dark:bg-[#8B5CF6] rounded-r-md z-20" />
            )}
            <div
              className={cn(
                "w-full flex items-center gap-3.5 px-3.5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[13px] sm:text-[13.5px]",
                isDashboard
                  ? "bg-[#fdeeed] dark:bg-[#8B5CF6]/15 text-[#0f172a] dark:text-[#F5F5F7] font-bold"
                  : "text-[#334155] dark:text-[#A5A7B0] font-semibold"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 shrink-0",
                  isDashboard ? "text-[#ea384d] dark:text-[#8B5CF6]" : "text-[#475569] dark:text-[#A5A7B0]"
                )}
              />
              <span className="truncate tracking-tight leading-none">{item.label}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  // Prevent background scrolling on mobile when open
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBodyScroll = () => {
      const isMobile = window.innerWidth < 1024;
      if (isOpen && isMobile) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        document.body.style.touchAction = "none";
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
        document.body.style.touchAction = "";
      }
    };

    handleBodyScroll();
    window.addEventListener("resize", handleBodyScroll);

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
      window.removeEventListener("resize", handleBodyScroll);
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      {/* Permanently Fixed Sidebar (100vh height, fixed top-0 bottom-0 left-0, never scrolls with page) */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 bg-[#fafbfe] dark:bg-[#0A0B0F] border-r border-[#edf0f4] dark:border-[#292C35] flex flex-col justify-between transition-colors duration-300 ease-in-out select-none overflow-hidden w-64 xl:w-[268px]",
          isOpen
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 pointer-events-none"
        )}
        style={{ height: "100vh", maxHeight: "100vh" }}
      >
        {/* Unified Scroll Container (If screen is very short, everything scrolls together smoothly so items never slide under graphic) */}
        <div className="flex-1 flex flex-col justify-between h-full overflow-y-auto overflow-x-hidden no-scrollbar">
          {/* Top Section: Brand Header + Navigation Items */}
          <div className="shrink-0 pt-5 pb-2">
            {/* Logo and Brand Header */}
            <div className="px-5 mb-5 shrink-0">
              <Link
                href="/"
                onClick={() => {
                  if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();
                }}
                className="flex items-center gap-3 group"
              >
                <LogForgeLogo size={36} showWordmark={true} />
              </Link>
            </div>

            {/* Navigation Items */}
            <div>
              <Suspense fallback={<NavListFallback />}>
                <NavList onClose={onClose} />
              </Suspense>
            </div>
          </div>

          {/* Bottom Section: Full-Bleed Cyber Graphic */}
          <div className="relative w-full h-[220px] sm:h-[240px] xl:h-[280px] shrink-0 overflow-hidden mt-auto">
            {/* Background Illustration */}
            <Image
              src="/images/sidebar-secure-banner.jpg"
              alt="Secure Analyze Stay Ahead Cyber Infrastructure"
              fill
              className="object-cover object-top pointer-events-none select-none"
              priority
            />

            {/* Top smooth gradient fade into the sidebar background */}
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-[#fafbfe] dark:from-[#0A0B0F] via-[#fafbfe]/70 dark:via-[#0A0B0F]/70 to-transparent pointer-events-none transition-colors" />

            {/* Bottom vignette for crisp typography */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent pointer-events-none" />

            {/* Text Overlay: Elevated slightly so browser URL tooltip doesn't overlap */}
            <div className="absolute bottom-6 left-5 z-10 space-y-0.5 select-none pointer-events-none">
              <div className="text-[13px] font-black tracking-widest text-slate-100 leading-tight drop-shadow-sm">
                SECURE
              </div>
              <div className="text-[13px] font-black tracking-widest text-slate-100 leading-tight drop-shadow-sm">
                ANALYZE
              </div>
              <div className="text-[13px] font-black tracking-widest text-slate-100 leading-tight drop-shadow-sm">
                STAY AHEAD
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
