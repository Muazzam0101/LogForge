"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/context/AuthContext";
import { useTheme } from "@/components/context/ThemeContext";
import { LogForgeLogo } from "@/components/ui/LogForgeLogo";
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Cpu,
  Sun,
  Moon,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already authenticated, redirect to dashboard root
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username.trim(), password);
      router.push("/");
    } catch (err: any) {
      setError(
        err.message || "Authentication failed. Please verify your credentials."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-slate-50 dark:bg-[#0A0B0E] text-slate-900 dark:text-[#F5F5F7] transition-colors overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 -left-40 w-96 h-96 bg-orange-500/10 dark:bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-40 w-96 h-96 bg-indigo-500/10 dark:bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Brand & Theme Toggle */}
      <div className="absolute top-5 right-6 flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200 dark:border-[#292C35] bg-white/80 dark:bg-[#17191F]/80 backdrop-blur-md text-slate-500 dark:text-[#A5A7B0] hover:text-slate-800 dark:hover:text-white transition-all cursor-pointer shadow-xs"
          title="Toggle color theme"
          aria-label="Toggle color theme"
        >
          {theme === "dark" ? (
            <Moon className="w-4 h-4 text-[#8B5CF6]" />
          ) : (
            <Sun className="w-4 h-4 text-orange-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Brand Header matching System Logo & Typography (img1) */}
        <div className="flex justify-center mb-8">
          <LogForgeLogo size={46} showWordmark={true} textSize="lg" />
        </div>

        {/* Login Card */}
        <div className="bg-white/90 dark:bg-[#13151B]/95 backdrop-blur-xl border border-slate-200/80 dark:border-[#242731] rounded-3xl p-7 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-black/40">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Platform Authentication
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#A5A7B0] mt-0.5">
              Enter your credentials to access the air-gapped SIEM console.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username / Email */}
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-semibold text-slate-700 dark:text-[#D1D5DB] mb-1.5"
              >
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#A5A7B0]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-[#F5F5F7] placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 dark:text-[#D1D5DB] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-[#A5A7B0]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-[#1A1D24] text-slate-900 dark:text-[#F5F5F7] placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-[#2B2F3B] rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/20 focus:border-orange-500 dark:focus:border-orange-500 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-[#F5F5F7] cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-orange-500/25 hover:shadow-lg hover:shadow-orange-500/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to LogForge</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security & Air-Gapped Compliance Assurance */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-[#22252E] flex flex-col gap-2 text-[11px] text-slate-400 dark:text-[#A5A7B0]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Zero-Telemetry & 100% Air-Gapped Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span>PBKDF2-HMAC-SHA256 (600k rounds) Salted Hashing</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Role-Based Access Control & Immutable Audit Trail</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 mt-6">
          LogForge Intelligence Platform v0.1.0 · Protected by Cryptographic Merkle Proofs
        </p>
      </div>
    </div>
  );
}
