"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ModalProvider, useModals } from "@/components/context/ModalContext";
import { UploadLogsModal } from "@/components/modals/UploadLogsModal";
import { ExplorePipelineModal } from "@/components/modals/ExplorePipelineModal";
import { AddSourceModal } from "@/components/modals/AddSourceModal";

import { cn } from "@/lib/utils";

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const {
    isUploadModalOpen,
    closeUploadModal,
    isExploreModalOpen,
    closeExploreModal,
    isAddSourceModalOpen,
    closeAddSourceModal,
  } = useModals();

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

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
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
