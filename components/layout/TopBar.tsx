"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, Sun, ChevronDown, PanelLeft, PanelLeftClose, ShieldCheck, Check } from "lucide-react";

interface TopBarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ isSidebarOpen, onToggleSidebar }: TopBarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global shortcut: Ctrl+K or '/' focuses search bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.ctrlKey && e.key.toLowerCase() === "k")) &&
        !(
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        )
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-7 bg-white/95 backdrop-blur-md border-b border-slate-150 transition-all">
      {/* Left side: Sidebar Toggle button + Global Search with Ctrl K */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
          title={isSidebarOpen ? "Close sidebar (Ctrl+B)" : "Open sidebar (Ctrl+B)"}
          aria-label="Toggle sidebar"
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 text-slate-600" />
          ) : (
            <PanelLeft className="w-5 h-5 text-orange-600" />
          )}
        </button>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className={`w-4 h-4 transition-colors ${isFocused ? "text-orange-600" : ""}`} />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={searchValue}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search events, IPs, keywords, or event IDs..."
            className="w-full pl-9 pr-14 py-2 text-xs sm:text-[13px] bg-slate-50/60 hover:bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-2xs"
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-sans font-semibold text-slate-400 bg-white border border-slate-200 rounded-md shadow-2xs">
              <span>Ctrl</span>
              <span>K</span>
            </kbd>
          </div>
        </div>
      </div>

      {/* Right side: Theme Sun Toggle, Notifications & User Profile */}
      <div className="flex items-center gap-2.5 md:gap-3.5 ml-4">
        {/* Theme Sun Toggle Button */}
        <button
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Light Theme active"
          aria-label="Toggle theme"
        >
          <Sun className="w-4.5 h-4.5" />
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setUserDropdownOpen(false);
            }}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
            aria-label="View notifications"
          >
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Notifications</span>
                <span className="text-[11px] text-orange-600 font-medium cursor-pointer hover:underline">
                  Mark all as read
                </span>
              </div>
              <div className="py-6 text-center">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No new notifications</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  System alerts and pipeline notifications will show up here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile matching Reference Image: Orange Avatar with 'A', 'Admin', 'Security Analyst' */}
        <div className="relative">
          <button
            onClick={() => {
              setUserDropdownOpen(!userDropdownOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              A
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">Admin</div>
              <div className="text-[10px] text-slate-400 font-medium leading-tight">Security Analyst</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">Admin</p>
                <p className="text-[11px] text-slate-400 truncate">admin@logforge.security</p>
              </div>
              <div className="py-1">
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <ShieldCheck className="w-4 h-4 text-orange-600" />
                  <span>Role: Security Analyst</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>NTRO ULPF Session</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

