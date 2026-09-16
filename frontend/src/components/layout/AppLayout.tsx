"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { SearchInput } from "../ui/SearchInput";
import { Bell, HelpCircle, LogOut } from "lucide-react";
import { Avatar } from "../ui/Avatar";
import { Modal } from "../ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { NotificationCenter } from "../notifications/NotificationCenter";
import Link from "next/link";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [searchValue, setSearchValue] = useState("");
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const { user, profile, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const userName = profile?.name || user?.email?.split("@")[0] || "Researcher User";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F6F7F9] text-[#111111]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <MobileNav />

        {/* Global Desktop Top Bar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-[#E5E7EB] shrink-0">
          <div className="w-80">
            <SearchInput
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onClear={() => setSearchValue("")}
              placeholder="Search research, citations, files..."
            />
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsHelpOpen(true)}
              className="p-2 text-gray-500 hover:text-[#0000CD] hover:bg-blue-50 rounded-xl transition-colors"
              title="Workspace Help & Documentation"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsNotificationOpen(true)}
              className="relative p-2 text-gray-500 hover:text-[#0000CD] hover:bg-blue-50 rounded-xl transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-[#FF7F00] text-white ring-2 ring-white shadow-2xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="h-6 w-px bg-[#E5E7EB]" />

            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
                <Avatar name={userName} status="online" size="sm" />
                <span className="text-xs font-semibold font-heading text-[#111111]">
                  {userName}
                </span>
              </Link>

              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>

      {/* Quick Help Modal */}
      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="ResearchCompany Help Workspace"
        description="Learn how to make the most of your research assistant, file management, and citation tools."
      >
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-xl bg-blue-50/70 border border-[#0000CD]/20 text-xs text-gray-700">
            <p className="font-semibold text-[#0000CD] mb-1">💡 Research Tip:</p>
            You can search files, citations, and conversation history using the universal search bar at the top of the workspace layout.
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            ResearchCompany is designed for high-focus research sessions. Utilize the left navigation panel to switch between AI assistance, document repositories, citation formats, and team collaboration.
          </p>
        </div>
      </Modal>

      {/* Notification Center Drawer */}
      <NotificationCenter
        notifications={notifications}
        unreadCount={unreadCount}
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </div>
  );
};
