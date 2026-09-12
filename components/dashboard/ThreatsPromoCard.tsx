"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Shield, ArrowUpRight } from "lucide-react";

export function ThreatsPromoCard() {
  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[360px] flex flex-col justify-between p-6 text-white shadow-[0_8px_30px_rgba(0,0,0,0.12)] group border border-slate-800">
      {/* Background Image with Dark & Warm Glow Overlays */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/threats-card-bg.jpg"
          alt="Cyber Intelligence Server Infrastructure"
          fill
          className="object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          priority
        />
        {/* Deep contrast gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1017] via-[#0e1017]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e1017]/90 via-transparent to-[#0e1017]/50" />
      </div>

      {/* Top Badge */}
      <div className="relative z-10">
        <div className="w-11 h-11 rounded-2xl bg-orange-500/20 border border-orange-500/40 backdrop-blur-md flex items-center justify-center text-orange-400 shadow-[0_0_20px_rgba(249,87,56,0.3)]">
          <Shield className="w-5 h-5 stroke-[2.2]" />
        </div>
      </div>

      {/* Content & Bottom Arrow */}
      <div className="relative z-10 pt-16">
        <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
          Threats Hide in <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
            Plain Sight.
          </span>
        </h3>
        <p className="text-xs text-slate-300 font-medium max-w-[220px] leading-relaxed mb-6">
          See more. Know faster. Stay ahead with autonomous log intelligence.
        </p>

        {/* Circular Action Button */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-wider uppercase text-orange-400/90 font-bold">
            Explore Threats
          </span>
          <Link
            href="/explorer"
            className="w-12 h-12 rounded-full bg-white text-slate-900 hover:bg-orange-500 hover:text-white transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-orange-500/30 group-hover:scale-110 cursor-pointer"
            aria-label="Investigate threats in Explorer"
          >
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
