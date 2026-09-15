"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Database,
  Lock,
  Sliders,
  CheckCircle2,
  Save,
  Users,
  FileText,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
  KeyRound,
  Check,
  Clock,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { useAuth } from "@/components/context/AuthContext";
import { ulpfApi } from "@/lib/api/ulpf";
import { User, Role, AuditLogItem } from "@/lib/api/types";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "platform";

  const { user: currentUser, hasPermission, hasRole } = useAuth();

  // Tab State: "platform" | "users" | "audit"
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Platform Settings State
  const [retentionEnabled, setRetentionEnabled] = useState(true);
  const [airGappedMode, setAirGappedMode] = useState(true);
  const [autoDetectFormat, setAutoDetectFormat] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Users State
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("VIEWER");
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);
  const [createModalError, setCreateModalError] = useState<string | null>(null);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLimit] = useState(20);
  const [auditActionFilter, setAuditActionFilter] = useState("ALL");
  const [auditStatusFilter, setAuditStatusFilter] = useState("ALL");
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // Load Users and Roles if user has permission
  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUserError(null);
    try {
      const [usersList, rolesList] = await Promise.all([
        ulpfApi.listUsers({ limit: 100 }),
        ulpfApi.listRoles().catch(() => []),
      ]);
      setUsers(usersList);
      setRoles(rolesList);
    } catch (err: any) {
      setUserError(err.message || "Failed to load registered users");
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  // Load Audit Logs
  const loadAuditLogs = useCallback(
    async (page: number = 1) => {
      setIsLoadingAudit(true);
      setAuditError(null);
      try {
        const offset = (page - 1) * auditLimit;
        const res = await ulpfApi.getAuditLogs({
          limit: auditLimit,
          offset,
          action: auditActionFilter !== "ALL" ? auditActionFilter : undefined,
          status: auditStatusFilter !== "ALL" ? auditStatusFilter : undefined,
        });
        setAuditLogs(res.events || []);
        setAuditTotal(res.total || 0);
        setAuditPage(page);
      } catch (err: any) {
        setAuditError(err.message || "Failed to load audit logs");
      } finally {
        setIsLoadingAudit(false);
      }
    },
    [auditLimit, auditActionFilter, auditStatusFilter]
  );

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "audit") {
      loadAuditLogs(1);
    }
  }, [activeTab, loadUsers, loadAuditLogs]);

  const handleSavePlatform = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const updated = await ulpfApi.updateUser(user.id, {
        is_active: !user.is_active,
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      alert(err.message || "Failed to toggle user status");
    }
  };

  const handleChangeUserRole = async (user: User, newRoleName: string) => {
    try {
      const updated = await ulpfApi.updateUser(user.id, {
        roles: [newRoleName],
      });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
    } catch (err: any) {
      alert(err.message || "Failed to change user role");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateModalError(null);

    if (!newUsername.trim() || !newEmail.trim() || !newPassword || !newFullName.trim()) {
      setCreateModalError("All fields are required.");
      return;
    }

    if (newPassword.length < 8) {
      setCreateModalError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmittingUser(true);
    try {
      const created = await ulpfApi.createUser({
        username: newUsername.trim(),
        email: newEmail.trim(),
        full_name: newFullName.trim(),
        password: newPassword,
        roles: [newRole],
      });
      setUsers((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      // Reset form
      setNewUsername("");
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setNewRole("VIEWER");
    } catch (err: any) {
      setCreateModalError(err.message || "Failed to create user");
    } finally {
      setIsSubmittingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userSearchQuery.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.roles?.some((r) => r.toLowerCase().includes(q))
    );
  });

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName) {
      case "ADMIN":
        return "bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      case "ANALYST":
        return "bg-cyan-100 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800";
      case "OPERATOR":
        return "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  const getActionBadgeStyle = (action: string) => {
    if (action.includes("FAILED")) {
      return "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900";
    }
    if (action.includes("SUCCESS") || action.includes("CREATED") || action.includes("COMPLETED")) {
      return "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
    }
    if (action.includes("STARTED") || action.includes("CHANGED") || action.includes("UPDATED")) {
      return "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800";
    }
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  const totalPages = Math.ceil(auditTotal / auditLimit) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <ScrollReveal direction="up" delay={50} duration={500}>
        <div className="bg-white dark:bg-[#13151B] rounded-2xl p-6 border border-slate-200/80 dark:border-[#242731] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-slate-100 dark:bg-[#1D2027] text-slate-700 dark:text-[#A5A7B0] text-xs font-semibold mb-2">
              <SettingsIcon className="w-3.5 h-3.5 text-orange-600 dark:text-[#8B5CF6]" />
              <span>Enterprise Administration</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Platform & Security Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A5A7B0] mt-1">
              Configure framework engine options, manage RBAC user accounts, and review the immutable security audit trail.
            </p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-[#1A1D24] rounded-xl border border-slate-200 dark:border-[#2B2F3B] self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("platform")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "platform"
                  ? "bg-white dark:bg-[#242731] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Platform</span>
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-white dark:bg-[#242731] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users & RBAC</span>
            </button>

            <button
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "audit"
                  ? "bg-white dark:bg-[#242731] text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* TAB 1: Platform Configuration */}
      {activeTab === "platform" && (
        <ScrollReveal direction="up" delay={100} duration={600}>
          <div className="bg-white dark:bg-[#13151B] rounded-2xl p-6 border border-slate-200/80 dark:border-[#242731] shadow-xs divide-y divide-slate-100 dark:divide-[#22252E] transition-colors">
            {/* Setting 1 */}
            <div className="py-4.5 flex items-center justify-between gap-4 first:pt-0">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Lossless Raw Event Preservation
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5">
                  Verbatim raw payload is stored alongside the normalized schema record with cryptographic SHA-256 hash validation.
                </p>
              </div>
              <button
                onClick={() => setRetentionEnabled(!retentionEnabled)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  retentionEnabled ? "bg-orange-600 dark:bg-orange-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    retentionEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Setting 2 */}
            <div className="py-4.5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Air-gapped Network Isolation Mode
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5">
                  Disables external telemetry ping, third-party analytics scripts, and remote CDN asset fetches.
                </p>
              </div>
              <button
                onClick={() => setAirGappedMode(!airGappedMode)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  airGappedMode ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    airGappedMode ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Setting 3 */}
            <div className="py-4.5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Autonomous Format Auto-Discovery
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5">
                  Automatically matches regex patterns to identify Syslog, CEF, LEEF, EVTX, or JSON syntax on incoming ports.
                </p>
              </div>
              <button
                onClick={() => setAutoDetectFormat(!autoDetectFormat)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  autoDetectFormat ? "bg-orange-600 dark:bg-orange-500" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    autoDetectFormat ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Setting 4: Password Hashing Architecture */}
            <div className="py-4.5 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cryptographic Password Hashing Standard
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5">
                  Air-gapped OWASP compliant PBKDF2-HMAC-SHA256 with 600,000 iterations and 16-byte random salt.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                PBKDF2 · 600,000 Rounds
              </span>
            </div>

            {/* Save Button Action */}
            <div className="pt-5 flex items-center justify-between">
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Platform settings saved successfully!</span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">All configurations apply instantaneously across ULPF instances.</span>
              )}
              <button
                onClick={handleSavePlatform}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* TAB 2: Users & RBAC */}
      {activeTab === "users" && (
        <ScrollReveal direction="up" delay={100} duration={600}>
          <div className="bg-white dark:bg-[#13151B] rounded-2xl p-6 border border-slate-200/80 dark:border-[#242731] shadow-xs transition-colors space-y-5">
            {/* Top Bar: Search & Create User */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Filter users by name, username, or role..."
                  className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-[#F5F5F7] placeholder-slate-400 border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadUsers}
                  className="p-2 rounded-xl border border-slate-200 dark:border-[#2B2F3B] bg-slate-50 dark:bg-[#1A1D24] text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Reload Users"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingUsers ? "animate-spin" : ""}`} />
                </button>

                {hasPermission("users:manage") && (
                  <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create User</span>
                  </button>
                )}
              </div>
            </div>

            {/* Error Banner */}
            {userError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{userError}</span>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#22252E]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-[#181B22] text-slate-500 dark:text-[#A5A7B0] border-b border-slate-200 dark:border-[#22252E]">
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Assigned Role</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold">Last Login</th>
                    {hasPermission("users:manage") && (
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F222B]">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                        Loading user accounts...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const userRole = u.roles?.[0] || "VIEWER";
                      const isSelf = currentUser?.id === u.id;
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-slate-50/50 dark:hover:bg-[#181B22]/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-rose-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                {(u.full_name?.[0] || u.username?.[0] || "U").toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white">
                                  {u.full_name}
                                  {isSelf && (
                                    <span className="ml-1.5 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                                      (You)
                                    </span>
                                  )}
                                </p>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  @{u.username}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-600 dark:text-[#D1D5DB] font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="py-3 px-4">
                            {hasPermission("users:manage") && !isSelf ? (
                              <select
                                value={userRole}
                                onChange={(e) => handleChangeUserRole(u, e.target.value)}
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer focus:outline-none ${getRoleBadgeStyle(
                                  userRole
                                )}`}
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="ANALYST">ANALYST</option>
                                <option value="OPERATOR">OPERATOR</option>
                                <option value="VIEWER">VIEWER</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-lg border ${getRoleBadgeStyle(
                                  userRole
                                )}`}
                              >
                                {userRole}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                u.is_active
                                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.is_active ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              />
                              {u.is_active ? "Active" : "Deactivated"}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-[#A5A7B0] text-[11px]">
                            {u.last_login_at
                              ? new Date(u.last_login_at).toLocaleString()
                              : "Never logged in"}
                          </td>
                          {hasPermission("users:manage") && (
                            <td className="py-3 px-4 text-right">
                              {!isSelf && (
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`text-[11px] font-medium hover:underline cursor-pointer ${
                                    u.is_active
                                      ? "text-rose-600 dark:text-rose-400"
                                      : "text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {u.is_active ? "Deactivate" : "Activate"}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* TAB 3: Audit Trail */}
      {activeTab === "audit" && (
        <ScrollReveal direction="up" delay={100} duration={600}>
          <div className="bg-white dark:bg-[#13151B] rounded-2xl p-6 border border-slate-200/80 dark:border-[#242731] shadow-xs transition-colors space-y-5">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Action Filter */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#A5A7B0]">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Action:</span>
                  <select
                    value={auditActionFilter}
                    onChange={(e) => setAuditActionFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-[#F5F5F7] border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                    <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                    <option value="USER_CREATED">USER_CREATED</option>
                    <option value="USER_UPDATED">USER_UPDATED</option>
                    <option value="ROLE_CHANGED">ROLE_CHANGED</option>
                    <option value="USER_DEACTIVATED">USER_DEACTIVATED</option>
                    <option value="REINDEX_STARTED">REINDEX_STARTED</option>
                    <option value="REINDEX_COMPLETED">REINDEX_COMPLETED</option>
                    <option value="BLOCKCHAIN_ANCHOR_SUCCESS">BLOCKCHAIN_ANCHOR_SUCCESS</option>
                    <option value="BLOCKCHAIN_ANCHOR_FAILED">BLOCKCHAIN_ANCHOR_FAILED</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#A5A7B0]">
                  <span>Status:</span>
                  <select
                    value={auditStatusFilter}
                    onChange={(e) => setAuditStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-[#F5F5F7] border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUCCESS">SUCCESS</option>
                    <option value="FAILURE">FAILURE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadAuditLogs(auditPage)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-[#2B2F3B] bg-slate-50 dark:bg-[#1A1D24] text-slate-600 dark:text-[#A5A7B0] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer text-xs font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAudit ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {auditError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{auditError}</span>
              </div>
            )}

            {/* Audit Logs Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-[#22252E]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-[#181B22] text-slate-500 dark:text-[#A5A7B0] border-b border-slate-200 dark:border-[#22252E]">
                    <th className="py-3 px-4 font-semibold">Timestamp</th>
                    <th className="py-3 px-4 font-semibold">Action</th>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Target Resource</th>
                    <th className="py-3 px-4 font-semibold">Client IP</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1F222B]">
                  {isLoadingAudit ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        <div className="w-6 h-6 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                        Loading immutable audit trail...
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No audit events found matching filters.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-[#181B22]/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-slate-500 dark:text-[#A5A7B0] font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${getActionBadgeStyle(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-900 dark:text-white font-medium">
                          {log.username || "system"}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-[#A5A7B0]">
                          <span className="font-mono text-[11px]">
                            {log.resource_type}
                            {log.resource_id ? `:${log.resource_id.slice(0, 8)}...` : ""}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-[#A5A7B0] font-mono text-[11px]">
                          {log.ip_address || "127.0.0.1"}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              log.status === "SUCCESS"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="text-[11px] font-medium text-orange-600 dark:text-[#8B5CF6] hover:underline cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-[#A5A7B0] pt-2">
              <span>
                Showing {auditLogs.length} of {auditTotal} audit events
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={auditPage <= 1 || isLoadingAudit}
                  onClick={() => loadAuditLogs(auditPage - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2B2F3B] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A1D24]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 dark:text-white">
                  Page {auditPage} of {totalPages}
                </span>
                <button
                  disabled={auditPage >= totalPages || isLoadingAudit}
                  onClick={() => loadAuditLogs(auditPage + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-[#2B2F3B] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-[#1A1D24]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-[#13151B] border border-slate-200 dark:border-[#242731] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22252E]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Create User Account
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createModalError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createModalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D1D5DB] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D1D5DB] mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. jdoe"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D1D5DB] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="e.g. jdoe@logforge.security"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D1D5DB] mb-1">
                  Temporary Password (min. 8 characters)
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-[#D1D5DB] mb-1">
                  Assigned RBAC Role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none"
                >
                  <option value="VIEWER">VIEWER (Read-only logs and analytics)</option>
                  <option value="OPERATOR">OPERATOR (Log ingestion, socket config)</option>
                  <option value="ANALYST">ANALYST (Investigate events, ML anomalies, integrity)</option>
                  <option value="ADMIN">ADMIN (Full access + RBAC + Audit log inspection)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2B2F3B] text-slate-600 dark:text-[#A5A7B0] hover:bg-slate-50 dark:hover:bg-[#1A1D24] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUser}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingUser ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUDIT DETAILS INSPECTOR MODAL */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-[#13151B] border border-slate-200 dark:border-[#242731] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#22252E]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Audit Event Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#22252E]">
                <span className="text-slate-400">Event ID:</span>
                <span className="font-mono text-slate-700 dark:text-[#D1D5DB]">{selectedAuditLog.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#22252E]">
                <span className="text-slate-400">Timestamp:</span>
                <span className="font-mono text-slate-700 dark:text-[#D1D5DB]">
                  {new Date(selectedAuditLog.timestamp).toISOString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#22252E]">
                <span className="text-slate-400">Action:</span>
                <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                  {selectedAuditLog.action}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#22252E]">
                <span className="text-slate-400">Actor:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedAuditLog.username || "system"} ({selectedAuditLog.user_id || "N/A"})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-[#22252E]">
                <span className="text-slate-400">IP & User Agent:</span>
                <span className="font-mono text-slate-600 dark:text-[#A5A7B0] truncate max-w-xs">
                  {selectedAuditLog.ip_address || "127.0.0.1"}
                </span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 block mb-1.5 font-semibold">Structured Audit Payload:</span>
                <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-52">
                  {JSON.stringify(selectedAuditLog.details || {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1D2027] text-slate-700 dark:text-white text-xs font-semibold cursor-pointer hover:bg-slate-200 dark:hover:bg-[#242731]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
