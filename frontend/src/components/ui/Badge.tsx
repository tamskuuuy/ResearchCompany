"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps {
  variant?: "primary" | "accent" | "neutral" | "success" | "outline";
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "primary",
  children,
  className,
}) => {
  const variantStyles = {
    primary: "bg-[#EEF2FF] text-[#0000CD] border border-[#0000CD]/20",
    accent: "bg-[#FFF3E6] text-[#FF7F00] border border-[#FF7F00]/20",
    neutral: "bg-gray-100 text-gray-700 border border-gray-200",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    outline: "bg-transparent text-gray-600 border border-[#E5E7EB]",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors select-none",
          variantStyles[variant],
          className
        )
      )}
    >
      {children}
    </span>
  );
};
