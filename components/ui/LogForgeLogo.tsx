"use client";

import React from "react";
import Image from "next/image";

interface LogForgeLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
}

export function LogForgeLogo({
  className = "",
  size = 42,
  showWordmark = false,
}: LogForgeLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* High-Resolution Cybersecurity Brand Logo Image */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-2xl overflow-hidden shadow-sm shadow-indigo-500/20 border border-slate-200/80 bg-white transition-all duration-300 group-hover:scale-105 group-hover:shadow-md group-hover:border-purple-300"
        style={{ width: size, height: size }}
      >
        <Image
          src="/logforge-lf-logo.png"
          alt="LogForge Cybersecurity LF Shield Logo"
          width={size * 2}
          height={size * 2}
          className="w-full h-full object-contain p-0.5"
          priority
          unoptimized
        />
      </div>

      {showWordmark && (
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              Log<span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Forge</span>
            </span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded-md border border-purple-200/70">
              ULPF
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 leading-tight">
            Universal Log Intelligence
          </p>
        </div>
      )}
    </div>
  );
}
