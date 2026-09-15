"use client";

import React from "react";
import Image from "next/image";

interface LogForgeLogoProps {
  className?: string;
  size?: number;
  showWordmark?: boolean;
  textSize?: "sm" | "md" | "lg";
}

export function LogForgeLogo({
  className = "",
  size = 38,
  showWordmark = false,
  textSize = "md",
}: LogForgeLogoProps) {
  const titleSize =
    textSize === "lg"
      ? "text-2xl"
      : textSize === "sm"
      ? "text-[15px]"
      : "text-[17px]";

  const subSize =
    textSize === "lg"
      ? "text-xs mt-1"
      : textSize === "sm"
      ? "text-[10px] mt-0.5"
      : "text-[11px] mt-0.5";

  return (
    <div className={`inline-flex items-center gap-3.5 ${className}`}>
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
          <span className={`font-extrabold text-slate-900 dark:text-white ${titleSize} tracking-tight block leading-tight`}>
            Log<span className="bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">Forge</span>
          </span>
          <p className={`font-medium text-slate-500 dark:text-slate-400 leading-tight ${subSize}`}>
            Universal Log Intelligence
          </p>
        </div>
      )}
    </div>
  );
}



