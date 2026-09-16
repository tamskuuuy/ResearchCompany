"use client";

import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "busy" | "offline";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name = "User",
  src,
  size = "md",
  status,
  className,
}) => {
  const getInitials = (n: string) => {
    const parts = n.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  const sizeStyles = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const statusColor = {
    online: "bg-[#FF7F00]", // Orange status dot highlight as requested
    busy: "bg-amber-500",
    offline: "bg-gray-300",
  };

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={twMerge(
          clsx(
            "rounded-full flex items-center justify-center font-semibold font-heading bg-[#EEF2FF] text-[#0000CD] border border-[#0000CD]/20 overflow-hidden shadow-xs select-none",
            sizeStyles[size],
            className
          )
        )}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>
      {status && (
        <span
          className={clsx(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-white",
            size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3",
            statusColor[status]
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};
