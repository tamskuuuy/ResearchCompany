"use client";

import React from "react";
import { UserNotification } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Bell,
  MessageSquare,
  CheckCircle2,
  Calendar,
  Flag,
  FolderKanban,
  FileText,
  UserPlus,
  Clock,
  X,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationCenterProps {
  notifications: UserNotification[];
  unreadCount: number;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  unreadCount,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const router = useRouter();

  if (!isOpen) return null;

  const handleNotificationClick = (n: UserNotification) => {
    if (!n.read_at) {
      onMarkAsRead(n.id);
    }

    onClose();

    // Contextual Routing
    if (n.conversation_id || n.type === "NEW_MESSAGE") {
      router.push(`/messages?channel=${n.conversation_id || ""}`);
    } else if (n.task_id || n.type.startsWith("TASK_")) {
      router.push("/schedule");
    } else if (n.milestone_id || n.type === "MILESTONE_APPROACHING") {
      router.push("/schedule");
    } else if (n.research_project_id) {
      router.push(`/research/${n.research_project_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "NEW_MESSAGE":
        return <MessageSquare className="w-4 h-4 text-[#0000CD]" />;
      case "TASK_ASSIGNED":
      case "TASK_DUE_SOON":
      case "TASK_OVERDUE":
        return <Calendar className="w-4 h-4 text-[#FF7F00]" />;
      case "MILESTONE_APPROACHING":
        return <Flag className="w-4 h-4 text-emerald-600" />;
      case "RESEARCH_INVITATION":
        return <UserPlus className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-2xs flex justify-end">
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-50 text-[#0000CD] rounded-xl">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-heading text-[#111111] flex items-center gap-2">
                  Notification Center
                  {unreadCount > 0 && <Badge variant="accent">{unreadCount} Unread</Badge>}
                </h3>
                <p className="text-[11px] text-gray-500">Realtime research activity and alerts</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-xs text-[#0000CD] hover:underline font-semibold px-2 py-1"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 p-2">
            {notifications.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Bell className="w-10 h-10 text-gray-300 mx-auto" />
                <p className="text-xs font-semibold text-gray-600">You&apos;re all caught up!</p>
                <p className="text-[11px] text-gray-400">No recent notifications found in your workspace.</p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read_at;
                const timeAgo = new Date(n.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-colors flex items-start gap-3 ${
                      isUnread ? "bg-blue-50/50 hover:bg-blue-100/50 border-l-4 border-[#0000CD]" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="p-2 bg-white rounded-xl border border-gray-200 shadow-2xs shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-bold font-heading truncate ${isUnread ? "text-[#111111]" : "text-gray-700"}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{n.message}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-[#E5E7EB] bg-gray-50/50 text-center text-[10px] text-gray-400">
            Synchronized with Supabase Cloud Realtime Engine
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
