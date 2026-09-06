"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  direction?: "up" | "down" | "left" | "right" | "none";
  delay?: number; // in milliseconds
  duration?: number; // in milliseconds
  className?: string;
  threshold?: number;
  once?: boolean;
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 600,
  className,
  threshold = 0.1,
  once = true,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentRef = domRef.current;
    if (!currentRef) return;

    // If browser doesn't support IntersectionObserver, reveal immediately
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(currentRef);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px", // triggers slightly before fully in view
      }
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, [threshold, once]);

  // Direction transform styles
  const getInitialTransform = () => {
    switch (direction) {
      case "up":
        return "translate-y-6";
      case "down":
        return "-translate-y-6";
      case "left":
        return "translate-x-6";
      case "right":
        return "-translate-x-6";
      case "none":
      default:
        return "translate-y-0 translate-x-0";
    }
  };

  return (
    <div
      ref={domRef}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
      className={cn(
        "transition-all ease-out transform will-change-[transform,opacity]",
        isVisible
          ? "opacity-100 translate-y-0 translate-x-0 filter-none"
          : `opacity-0 ${getInitialTransform()} pointer-events-none`,
        className
      )}
    >
      {children}
    </div>
  );
}
