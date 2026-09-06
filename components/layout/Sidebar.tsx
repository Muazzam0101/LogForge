"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowDownToLine,
  Search,
  Sliders,
  ShieldAlert,
  AlertTriangle,
  Layers,
  FileText,
  Server,
  Settings,
  Shield,
} from "lucide-react";
import { LogForgeLogo } from "@/components/ui/LogForgeLogo";
import { cn } from "@/lib/utils";

export type NavItemKey =
  | "dashboard"
  | "ingestion"
  | "explorer"
  | "sources"
  | "threats"
  | "alerts"
  | "integrations"
  | "reports"
  | "status"
  | "settings";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavSection {
  title: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }[];
}

const navSections: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "LOG OPERATIONS",
    items: [
      { href: "/ingestion", label: "Log Ingestion", icon: ArrowDownToLine },
      { href: "/explorer", label: "Logs Explorer", icon: Search },
      { href: "/sources", label: "Sources & Parsers", icon: Sliders },
    ],
  },
  {
    title: "SECURITY",
    items: [
      { href: "/threats", label: "Threat Analytics", icon: ShieldAlert },
      { href: "/alerts", label: "Security Alerts", icon: AlertTriangle },
    ],
  },
  {
    title: "PLATFORM",
    items: [
      { href: "/integrations", label: "Integrations", icon: Layers },
      { href: "/reports", label: "Reports", icon: FileText },
      { href: "/status", label: "System Status", icon: Server },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Prevent background scrolling on mobile when sidebar menu is open
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
      {/* Mobile backdrop with scroll prevention */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onClose}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col justify-between transition-all duration-300 ease-in-out lg:static lg:z-auto shrink-0",
          isOpen
            ? "w-64 translate-x-0 opacity-100"
            : "w-0 -translate-x-full lg:w-0 opacity-0 overflow-hidden pointer-events-none border-transparent"
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto overscroll-contain px-4 py-5 w-64">
          {/* Logo and Brand Header */}
          <div className="px-2 mb-6">
            <Link
              href="/"
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();
              }}
              className="flex items-center gap-3 group"
            >
              <LogForgeLogo size={42} showWordmark={true} />
            </Link>
          </div>

          {/* Navigation Items with Real Next.js Links */}
          <nav className="space-y-5 flex-1">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <div className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => {
                          if (typeof window !== "undefined" && window.innerWidth < 1024) onClose();
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                          isActive
                            ? "bg-purple-50/80 text-purple-700 font-semibold shadow-xs"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-purple-600 rounded-r-full" />
                        )}
                        <Icon
                          className={cn(
                            "w-4.5 h-4.5 transition-colors",
                            isActive
                              ? "text-purple-600 stroke-[2.2]"
                              : "text-slate-400 group-hover:text-slate-600"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bottom Security / SIH Badge Card */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-gradient-to-b from-purple-50/70 to-indigo-50/50 border border-purple-100/70 shadow-xs hover:border-purple-200 transition-colors">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 shrink-0 mt-0.5">
                  <Shield className="w-4 h-4 fill-purple-200 stroke-purple-600" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">
                    Secure. Standardized. Intelligent.
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Built for NTRO Universal Log Pre-processing Framework · SIH 2026.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
