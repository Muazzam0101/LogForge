"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ModalProvider, useModals } from "@/components/context/ModalContext";
import { useAuth } from "@/components/context/AuthContext";
import { UploadLogsModal } from "@/components/modals/UploadLogsModal";
import { ExplorePipelineModal } from "@/components/modals/ExplorePipelineModal";
import { AddSourceModal } from "@/components/modals/AddSourceModal";

import { cn } from "@/lib/utils";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const {
    isUploadModalOpen,
    closeUploadModal,
    isExploreModalOpen,
    closeExploreModal,
    isAddSourceModalOpen,
    closeAddSourceModal,
  } = useModals();

  // Safety timeout: Never stay stuck on splash screen for more than 1.5 seconds
  const [splashTimeout, setSplashTimeout] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashTimeout(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Redirect to /login if unauthenticated and not already on /login
  useEffect(() => {
    if ((!isLoading || splashTimeout) && !isAuthenticated && pathname !== "/login") {
      router.push("/login");
    }
  }, [isLoading, splashTimeout, isAuthenticated, pathname, router]);

  // Toggle sidebar with keyboard shortcut Ctrl+B or Cmd+B
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Full-screen rendering for login page
  if (pathname === "/login") {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0F1014] text-slate-900 dark:text-[#F5F5F7] transition-colors">
        {children}
      </div>
    );
  }

  // Loading splash while determining session state (capped at 1.5s)
  if (isLoading && !isAuthenticated && !splashTimeout) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0F1014] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-orange-500/20 border-t-orange-500 dark:border-[#8B5CF6]/20 dark:border-t-[#8B5CF6] rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-500 dark:text-[#A5A7B0]">Authenticating LogForge session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0F1014] text-slate-900 dark:text-[#F5F5F7] transition-colors flex">
      {/* Permanently Fixed Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area smoothly offset when sidebar is open */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "lg:pl-64 xl:pl-[268px]" : "lg:pl-0"
        )}
      >
        {/* Sticky Top Bar with Sidebar Toggle */}
        <TopBar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Content Wrapper */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full transition-all duration-300">
          {children}
        </main>
      </div>

      {/* Global Interactive Modals */}
      <UploadLogsModal
        isOpen={isUploadModalOpen}
        onClose={closeUploadModal}
      />

      <ExplorePipelineModal
        isOpen={isExploreModalOpen}
        onClose={closeExploreModal}
      />

      <AddSourceModal
        isOpen={isAddSourceModalOpen}
        onClose={closeAddSourceModal}
      />
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </ModalProvider>
  );
}
