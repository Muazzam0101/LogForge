"use client";

import React, { createContext, useContext, useState } from "react";
import { BatchProcessResponse, ProcessingResult } from "@/lib/api/types";

export type ActiveIngestionResult =
  | { type: "single"; data: ProcessingResult }
  | { type: "batch"; data: BatchProcessResponse };

interface ModalContextType {
  isUploadModalOpen: boolean;
  isExploreModalOpen: boolean;
  isAddSourceModalOpen: boolean;
  openUploadModal: () => void;
  closeUploadModal: () => void;
  openExploreModal: () => void;
  closeExploreModal: () => void;
  openAddSourceModal: () => void;
  closeAddSourceModal: () => void;
  activeResult: ActiveIngestionResult | null;
  setActiveResult: (result: ActiveIngestionResult | null) => void;
  // Backward compatibility adapters
  lastProcessedResult: ProcessingResult | null;
  setLastProcessedResult: (result: ProcessingResult | null) => void;
  lastBatchResult: BatchProcessResponse | null;
  setLastBatchResult: (result: BatchProcessResponse | null) => void;
  stagedLogContent: { raw_log: string; source_hint?: string } | null;
  setStagedLogContent: (content: { raw_log: string; source_hint?: string } | null) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);
  const [activeResult, setActiveResult] = useState<ActiveIngestionResult | null>(null);
  const [stagedLogContent, setStagedLogContent] = useState<{ raw_log: string; source_hint?: string } | null>(null);

  // Backward compatibility adapters
  const lastProcessedResult = activeResult?.type === "single" ? activeResult.data : null;
  const setLastProcessedResult = (result: ProcessingResult | null) => {
    if (result) {
      setActiveResult({ type: "single", data: result });
    } else if (activeResult?.type === "single") {
      setActiveResult(null);
    }
  };

  const lastBatchResult = activeResult?.type === "batch" ? activeResult.data : null;
  const setLastBatchResult = (result: BatchProcessResponse | null) => {
    if (result) {
      setActiveResult({ type: "batch", data: result });
    } else if (activeResult?.type === "batch") {
      setActiveResult(null);
    }
  };

  return (
    <ModalContext.Provider
      value={{
        isUploadModalOpen,
        isExploreModalOpen,
        isAddSourceModalOpen,
        openUploadModal: () => setIsUploadModalOpen(true),
        closeUploadModal: () => setIsUploadModalOpen(false),
        openExploreModal: () => setIsExploreModalOpen(true),
        closeExploreModal: () => setIsExploreModalOpen(false),
        openAddSourceModal: () => setIsAddSourceModalOpen(true),
        closeAddSourceModal: () => setIsAddSourceModalOpen(false),
        activeResult,
        setActiveResult,
        lastProcessedResult,
        setLastProcessedResult,
        lastBatchResult,
        setLastBatchResult,
        stagedLogContent,
        setStagedLogContent,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModals() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModals must be used within a ModalProvider");
  }
  return context;
}
