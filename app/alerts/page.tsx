"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Layers,
  Link2,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Lock,
  ExternalLink,
  ShieldAlert,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useModals } from "@/components/context/ModalContext";
import { ulpfApi } from "@/lib/api/ulpf";
import {
  IntegritySummary,
  IntegrityBatch,
  StoredEventDetail,
  StoredEventSummary,
  EventVerificationResult,
  ChainVerificationResult,
} from "@/lib/api/types";
import { EventDetailModal } from "@/components/explorer/EventDetailModal";

export default function DataIntegrityPage() {
  const { openUploadModal } = useModals();

  // State
  const [summary, setSummary] = useState<IntegritySummary | null>(null);
  const [batches, setBatches] = useState<IntegrityBatch[]>([]);
  const [recentEvents, setRecentEvents] = useState<StoredEventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<StoredEventDetail | null>(null);

  // Row-level verification states: event_id -> EventVerificationResult
  const [rowVerifications, setRowVerifications] = useState<Record<string, EventVerificationResult>>({});
  const [verifyingRows, setVerifyingRows] = useState<Record<string, boolean>>({});

  // Chain audit state
  const [chainResult, setChainResult] = useState<ChainVerificationResult | null>(null);
  const [isAuditingChain, setIsAuditingChain] = useState(false);

  // Batch creation & anchor state
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const [anchoringBatchId, setAnchoringBatchId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Copied helper
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRowClick = async (ev: StoredEventSummary) => {
    try {
      const detail = await ulpfApi.getLogById(ev.event_id);
      setSelectedEvent(detail);
    } catch {
      setSelectedEvent({
        ...ev,
        normalized_event: null,
        additional_fields: null,
      });
    }
  };


  // Fetch all live data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [sumRes, batchRes, logsRes] = await Promise.all([
        ulpfApi.getIntegritySummary().catch(() => null),
        ulpfApi.listIntegrityBatches(10).catch(() => []),
        ulpfApi.getLogs({ limit: 15 }).catch(() => null),
      ]);

      if (sumRes) setSummary(sumRes);
      if (batchRes) setBatches(batchRes);
      if (logsRes?.events) setRecentEvents(logsRes.events);
    } catch (err) {
      console.error("Failed to load integrity data:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle row-level live verification
  const handleVerifyRow = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setVerifyingRows((prev) => ({ ...prev, [eventId]: true }));
    try {
      const res = await ulpfApi.verifyEventIntegrity(eventId);
      setRowVerifications((prev) => ({ ...prev, [eventId]: res }));
      // Refresh summary
      const updatedSum = await ulpfApi.getIntegritySummary().catch(() => null);
      if (updatedSum) setSummary(updatedSum);
    } catch (err) {
      console.error(`Verification failed for ${eventId}:`, err);
    } finally {
      setVerifyingRows((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  // Handle Chain Audit
  const handleAuditChain = async () => {
    setIsAuditingChain(true);
    try {
      const res = await ulpfApi.verifyHashChain(500);
      setChainResult(res);
    } catch (err: any) {
      setChainResult({ is_valid: false, evaluated_records: 0, error: err.message });
    } finally {
      setIsAuditingChain(false);
    }
  };

  // Handle Create Batch
  const handleCreateBatch = async () => {
    setIsCreatingBatch(true);
    setActionMessage(null);
    try {
      const newBatch = await ulpfApi.createIntegrityBatch(50);
      setActionMessage({
        type: "success",
        text: `Created Merkle batch '${newBatch.batch_id.slice(0, 8)}...' with ${newBatch.event_count} events (Root: ${newBatch.root_hash.slice(0, 10)}...)`,
      });
      fetchData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to create batch" });
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // Handle Anchor Batch
  const handleAnchorBatch = async (batchId: string) => {
    setAnchoringBatchId(batchId);
    setActionMessage(null);
    try {
      const res = await ulpfApi.anchorIntegrityBatch(batchId);
      setActionMessage({
        type: "success",
        text: `Batch '${batchId.slice(0, 8)}...' anchored successfully! Status: ${res.blockchain_status} (Tx: ${res.blockchain_tx_hash?.slice(0, 10)}...)`,
      });
      fetchData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to anchor batch" });
    } finally {
      setAnchoringBatchId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white dark:bg-[#12131A] rounded-2xl p-6 border border-slate-150 dark:border-[#262833] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-colors">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-semibold mb-2.5">
              <Lock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              <span>Cryptographic Auditability & Blockchain Verification</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Data Integrity Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Lossless byte-for-byte SHA-256 verification, sequential tamper-evident hash chaining, and Merkle tree batch anchoring to prove log authenticity.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleAuditChain}
              disabled={isAuditingChain}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#1D2027] hover:bg-slate-200/80 dark:hover:bg-[#252932] text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Link2 className={`w-3.5 h-3.5 ${isAuditingChain ? "animate-spin" : "text-orange-600"}`} />
              <span>{isAuditingChain ? "Auditing Chain..." : "Audit Hash Chain"}</span>
            </button>

            <button
              onClick={handleCreateBatch}
              disabled={isCreatingBatch}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>{isCreatingBatch ? "Building Tree..." : "Generate Merkle Batch"}</span>
            </button>

            <button
              onClick={fetchData}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-white dark:bg-[#1D2027] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-[#252932] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Action Notification Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150 ${
            actionMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hash Chain Audit Result Banner (If triggered) */}
      {chainResult && (
        <div
          className={`p-4.5 rounded-2xl border flex items-center justify-between gap-4 animate-in fade-in duration-200 ${
            chainResult.is_valid
              ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                chainResult.is_valid ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              {chainResult.is_valid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider">
                {chainResult.is_valid ? "Hash Chain Continuum Intact" : "Broken Hash Chain Detected"}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">
                {chainResult.is_valid
                  ? `Successfully audited ${chainResult.evaluated_records} sequential event records. No deletions, insertions, or pointer breaks found.`
                  : `Chain verification failed: ${chainResult.error || "Pointer mismatch"}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setChainResult(null)}
            className="text-xs font-semibold px-3 py-1 rounded-lg bg-white dark:bg-[#1A1C24] border border-slate-200 dark:border-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      )}

      {/* 2. Key Metrics Grid */}
      <ScrollReveal direction="up" delay={100} duration={600}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Total Integrity Records */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl p-5 border border-slate-150 dark:border-[#262833] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Total Integrity Records
              </span>
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">
              {summary ? summary.total_records.toLocaleString() : "--"}
            </div>
            <p className="text-[11px] text-slate-400">Immutable SHA-256 digests recorded</p>
          </div>

          {/* Cryptographically Verified */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl p-5 border border-slate-150 dark:border-[#262833] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Verified Signatures
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary ? summary.verified_count.toLocaleString() : "--"}
            </div>
            <p className="text-[11px] text-slate-400">Pristine exact-byte hash matches</p>
          </div>

          {/* Tampered Events Detected */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl p-5 border border-slate-150 dark:border-[#262833] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Tampered Events
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                summary && summary.tampered_count > 0
                  ? "bg-rose-100 text-rose-700 animate-pulse"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-400"
              }`}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold ${
              summary && summary.tampered_count > 0 ? "text-rose-600" : "text-slate-700 dark:text-slate-300"
            }`}>
              {summary ? summary.tampered_count.toLocaleString() : "0"}
            </div>
            <p className="text-[11px] text-slate-400">
              {summary && summary.tampered_count > 0 ? "Warning: Hash mismatch detected!" : "Zero tampering detected"}
            </p>
          </div>

          {/* Blockchain Anchored */}
          <div className="bg-white dark:bg-[#12131A] rounded-2xl p-5 border border-slate-150 dark:border-[#262833] shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Blockchain Anchored
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {summary ? summary.blockchain_anchored_count.toLocaleString() : "--"}
            </div>
            <p className="text-[11px] text-slate-400">
              Network: {summary?.blockchain_network || "local-evm"} ({summary?.blockchain_status || "ACTIVE"})
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* 3. Recent Log Integrity Records Table */}
      <ScrollReveal direction="up" delay={150} duration={600}>
        <div className="bg-white dark:bg-[#12131A] rounded-2xl p-6 border border-slate-150 dark:border-[#262833] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                Event Cryptographic Records
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time ingested logs with immutable SHA-256 baselines and live server-side verification.
              </p>
            </div>

            <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 dark:bg-[#1A1C24] px-3 py-1 rounded-lg">
              Showing Latest {recentEvents.length} Events
            </span>
          </div>

          {recentEvents.length === 0 && !isLoading ? (
            <div className="py-16 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No integrity records available.
              </h4>
              <p className="text-xs text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
                Ingest security logs to begin automatic cryptographic SHA-256 recording and hash-chaining.
              </p>
              <button
                onClick={openUploadModal}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer"
              >
                Ingest Sample Logs
              </button>
            </div>
          ) : (
            <div className="w-full overflow-x-auto rounded-xl border border-slate-150 dark:border-[#262833]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-[#181A22] border-b border-slate-150 dark:border-[#262833] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4">SHA-256 Digest</th>
                    <th className="py-3 px-4">Integrity Status</th>
                    <th className="py-3 px-4">Blockchain</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#262833]">
                  {recentEvents.map((ev) => {
                    const rowVerify = rowVerifications[ev.event_id];
                    const isRowVerifying = verifyingRows[ev.event_id] || false;
                    const status = rowVerify ? rowVerify.integrity : "UNVERIFIED";

                    return (
                      <tr
                        key={ev.event_id}
                        onClick={() => handleRowClick(ev)}
                        className="hover:bg-slate-50/60 dark:hover:bg-[#181A22]/50 transition-colors cursor-pointer group"
                      >

                        {/* Event ID */}
                        <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span>{ev.event_id.slice(0, 8)}...</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(ev.event_id, ev.event_id);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                              title="Copy UUID"
                            >
                              {copiedKey === ev.event_id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Format */}
                        <td className="py-3 px-4">
                          <span className="font-mono font-bold text-[10px] uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1F222C] text-slate-700 dark:text-slate-300">
                            {ev.detected_format}
                          </span>
                        </td>

                        {/* SHA-256 Digest */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1.5 max-w-[260px]">
                            <span className="truncate">{ev.sha256_hash.slice(0, 12)}...{ev.sha256_hash.slice(-8)}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(`hash-${ev.event_id}`, ev.sha256_hash);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 transition-opacity"
                              title="Copy Full SHA-256"
                            >
                              {copiedKey === `hash-${ev.event_id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Integrity Status Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider ${
                              status === "VALID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : status === "TAMPERED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                            }`}
                          >
                            {status === "VALID" && <CheckCircle2 className="w-3 h-3" />}
                            {status === "TAMPERED" && <AlertTriangle className="w-3 h-3" />}
                            <span>{status}</span>
                          </span>
                        </td>

                        {/* Blockchain Status */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 px-2 py-0.5 rounded-md">
                            {rowVerify?.blockchain_status || (summary?.blockchain_status === "DISABLED" ? "OFFLINE" : "PENDING")}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => handleVerifyRow(e, ev.event_id)}
                            disabled={isRowVerifying}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white dark:bg-[#1A1C24] hover:bg-orange-50 dark:hover:bg-orange-950/30 text-slate-700 hover:text-orange-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <RefreshCw className={`w-3 h-3 ${isRowVerifying ? "animate-spin text-orange-600" : ""}`} />
                            <span>{isRowVerifying ? "Checking..." : "Verify"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* 4. Merkle Batches & Blockchain Anchors Section */}
      <ScrollReveal direction="up" delay={200} duration={600}>
        <div className="bg-white dark:bg-[#12131A] rounded-2xl p-6 border border-slate-150 dark:border-[#262833] shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">
                  Merkle Tree Batches & On-Chain Anchors
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Aggregated cryptographic roots committed to the blockchain. Zero raw payloads touch the ledger.
              </p>
            </div>

            <button
              onClick={handleCreateBatch}
              disabled={isCreatingBatch}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create New Batch</span>
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="py-12 text-center rounded-xl bg-slate-50 dark:bg-[#181A22] border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500">
              No Merkle batches created yet. Click <strong>Generate Merkle Batch</strong> above to group pending event hashes.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {batches.map((batch) => {
                const isAnchoring = anchoringBatchId === batch.batch_id;
                const isConfirmed = batch.blockchain_status === "CONFIRMED";

                return (
                  <div
                    key={batch.batch_id}
                    className="p-4 rounded-xl border border-slate-200/80 dark:border-[#262833] bg-white dark:bg-[#161821] space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-white">
                        Batch: {batch.batch_id.slice(0, 8)}...
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                          isConfirmed
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {batch.blockchain_status}
                      </span>
                    </div>

                    <div className="space-y-1.5 font-mono text-xs">
                      <div>
                        <span className="text-[10px] font-sans text-slate-400 block">Merkle Root Hash</span>
                        <p className="font-bold text-slate-700 dark:text-slate-300 break-all text-[11px]">
                          {batch.root_hash}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-400 font-sans">Aggregated Events:</span>
                        <span className="font-bold text-slate-800 dark:text-white">{batch.event_count}</span>
                      </div>

                      {batch.blockchain_tx_hash && (
                        <div className="pt-1">
                          <span className="text-[10px] font-sans text-slate-400 block">Transaction Hash</span>
                          <p className="text-purple-700 dark:text-purple-400 truncate text-[11px]">
                            {batch.blockchain_tx_hash}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-[#262833] flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {new Date(batch.created_at).toLocaleString()}
                      </span>

                      {!isConfirmed && (
                        <button
                          type="button"
                          onClick={() => handleAnchorBatch(batch.batch_id)}
                          disabled={isAnchoring}
                          className="px-3 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold border border-purple-200 transition-colors cursor-pointer"
                        >
                          {isAnchoring ? "Anchoring..." : "Anchor to Blockchain"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Event Detail Modal with Verification */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
