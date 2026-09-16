"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  interactive?: boolean;
  hoverHighlight?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { children, interactive = false, hoverHighlight = false, className, ...props },
    ref
  ) => {
    return (
      <motion.div
        ref={ref}
        whileHover={
          interactive
            ? { y: -3, scale: 1.008, transition: { duration: 0.2 } }
            : undefined
        }
        className={twMerge(
          clsx(
            "bg-white rounded-2xl border border-[#E5E7EB] p-5 shadow-sm transition-colors duration-200",
            interactive &&
              "cursor-pointer hover:border-gray-300 hover:shadow-md",
            hoverHighlight &&
              "hover:border-[#0000CD]/30 hover:ring-1 hover:ring-[#0000CD]/20",
            className
          )
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";
