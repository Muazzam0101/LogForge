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
  size = 38,
  showWordmark = false,
}: LogForgeLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* 3D Isometric Cyber Shield Emblem */}
      <div
        className="relative shrink-0 flex items-center justify-center transition-transform duration-200 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <Image
          src="/images/logforge-shield.png"
          alt="LogForge Security Emblem"
          width={size * 2}
          height={size * 2}
          className="w-full h-full object-contain"
          priority
        />
      </div>

      {showWordmark && (
        <div className="text-left">
          <span className="font-extrabold text-slate-900 dark:text-white text-[17px] tracking-tight block leading-tight">
            Log<span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">Forge</span>
          </span>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
            Universal Log Intelligence
          </p>
        </div>
      )}
    </div>
  );
}



