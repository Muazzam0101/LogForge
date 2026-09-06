"use client";

import React, { createContext, useContext, useState } from "react";

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
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState(false);

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
