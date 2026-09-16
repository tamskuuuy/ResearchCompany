"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, Folder as FolderIcon } from "lucide-react";

export interface BreadcrumbItem {
  id?: string;
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-gray-500 overflow-x-auto pb-1 scrollbar-none font-medium">
      <Link
        href="/research"
        className="flex items-center gap-1.5 hover:text-[#0000CD] transition-colors shrink-0"
      >
        <FolderKanban className="w-3.5 h-3.5 text-[#0000CD]" />
        <span>Research Files</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            {isLast || !item.href ? (
              <span className="font-semibold text-[#111111] truncate max-w-[200px] shrink-0">
                {item.name}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-[#0000CD] transition-colors truncate max-w-[160px] shrink-0"
              >
                {item.name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
