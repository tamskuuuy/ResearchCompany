"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  FolderKanban,
  BookmarkCheck,
  MessageSquare,
  CalendarDays,
  Settings,
  UserCircle,
  Compass,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { Avatar } from "../ui/Avatar";
import { Badge } from "../ui/Badge";
import { useAuth } from "@/context/AuthContext";

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const mainNavItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Assistant", href: "/assistant", icon: Bot, badge: "AI" },
  { name: "Research Files", href: "/research", icon: FolderKanban },
  { name: "Citations", href: "/citations", icon: BookmarkCheck },
  { name: "Communication", href: "/messages", icon: MessageSquare, badge: "3" },
  { name: "Schedule", href: "/schedule", icon: CalendarDays },
];

export const secondaryNavItems: NavItem[] = [
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Profile", href: "/profile", icon: UserCircle },
];

export const Sidebar: React.FC<{ onItemClick?: () => void }> = ({ onItemClick }) => {
  const pathname = usePathname();
  const { user, profile, logout } = useAuth();

  const userName = profile?.name || user?.email?.split("@")[0] || "Researcher User";

  const renderNavList = (items: NavItem[]) => (
    <ul className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onItemClick}
              className={clsx(
                "flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group font-medium select-none",
                isActive
                  ? "bg-[#EEF2FF] text-[#0000CD] font-semibold border-r-4 border-[#0000CD] shadow-2xs"
                  : "text-gray-600 hover:bg-gray-100 hover:text-[#111111]"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={clsx(
                    "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                    isActive ? "text-[#0000CD]" : "text-gray-400 group-hover:text-gray-700"
                  )}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <Badge
                  variant={item.badge === "AI" ? "accent" : "primary"}
                  className="px-2 py-0 text-[10px]"
                >
                  {item.badge}
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside className="w-64 bg-white border-r border-[#E5E7EB] flex flex-col h-full shrink-0 select-none">
      {/* Branding Header */}
      <div className="p-6 border-b border-[#E5E7EB]">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <img
            src="/logo.svg"
            alt="ResearchCompany Logo"
            className="w-9 h-9 object-contain group-hover:scale-105 transition-transform"
          />
          <div>
            <span className="font-heading font-extrabold text-lg tracking-tight text-[#111111] flex items-center gap-0.5">
              Research<span className="text-[#FF7F00]">Company</span>
            </span>
            <span className="block text-[11px] font-medium text-gray-500 tracking-wider uppercase">
              Workspace v1.0
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <div>
          <span className="px-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            Main Navigation
          </span>
          {renderNavList(mainNavItems)}
        </div>

        <div className="pt-4 border-t border-[#E5E7EB]">
          <span className="px-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
            System & Account
          </span>
          {renderNavList(secondaryNavItems)}
        </div>
      </div>

      {/* User Footer Profile & Logout Action */}
      <div className="p-4 border-t border-[#E5E7EB] bg-gray-50/50 space-y-2">
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Avatar name={userName} status="online" size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold font-heading text-[#111111] truncate">
              {userName}
            </p>
            <p className="text-[11px] text-gray-500 truncate">
              {user?.email || "Authenticated Researcher"}
            </p>
          </div>
        </Link>

        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors select-none"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
