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
      {/* Faceted Flame / Shield Emblem matching Reference Image */}
      <div
        className="relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden shadow-xs bg-gradient-to-br from-rose-500 via-red-600 to-orange-500 transition-transform duration-200 group-hover:scale-105"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 32 32" fill="none" className="w-[72%] h-[72%]" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 3L27 9V17C27 23.5 22.2 27.8 16 30C9.8 27.8 5 23.5 5 17V9L16 3Z" fill="url(#lf_grad_1)" />
          <path d="M16 5.5L24.5 10.2V16.8C24.5 22 20.8 25.5 16 27.4C11.2 25.5 7.5 22 7.5 16.8V10.2L16 5.5Z" fill="url(#lf_grad_2)" opacity="0.9" />
          <path d="M16 8.5L21.5 12V16.5C21.5 20.2 19 22.8 16 24.3C13 22.8 10.5 20.2 10.5 16.5V12L16 8.5Z" fill="#ffffff" fillOpacity="0.3" />
          <path d="M16 11.5L19 13.5V16.8C19 19 17.5 20.5 16 21.3C14.5 20.5 13 19 13 16.8V13.5L16 11.5Z" fill="#ffffff" />
          <defs>
            <linearGradient id="lf_grad_1" x1="5" y1="3" x2="27" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF4D4D" />
              <stop offset="0.5" stopColor="#EA384D" />
              <stop offset="1" stopColor="#F95738" />
            </linearGradient>
            <linearGradient id="lf_grad_2" x1="16" y1="5.5" x2="16" y2="27.4" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.15" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showWordmark && (
        <div className="text-left">
          <span className="font-extrabold text-slate-900 text-[17px] tracking-tight block leading-tight">
            LogForge
          </span>
          <p className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5">
            Universal Log Intelligence
          </p>
        </div>
      )}
    </div>
  );
}

