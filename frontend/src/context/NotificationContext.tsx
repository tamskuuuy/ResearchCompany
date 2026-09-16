"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { UserNotification } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";

interface NotificationContextType {
  notifications: UserNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRealtimeConnected: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(false);
  const supabase = createClient();

  // Authoritative DB Fetch with deduplication
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/notifications?limit=30");
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch authoritative notification state:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial load on user auth
  useEffect(() => {
    if (user) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
    }
  }, [user, fetchNotifications]);

  // Supabase Realtime Subscription with ID Deduplication & Reconnect Recovery
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user_notifications_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newNotif = payload.new as UserNotification;

          // Stable ID Deduplication
          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) {
              return prev; // Ignore duplicate event
            }

            // Increment unread count if unread
            if (!newNotif.read_at) {
              setUnreadCount((count) => count + 1);
            }

            return [newNotif, ...prev];
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setIsRealtimeConnected(true);
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setIsRealtimeConnected(false);
          // On reconnect or disconnect, refetch from backend database to ensure zero missed events
          fetchNotifications();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications, supabase]);

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        // Rollback on failure
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      fetchNotifications();
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    // Optimistic UI update
    const now = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
    setUnreadCount(0);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      fetchNotifications();
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isRealtimeConnected,
        markAsRead,
        markAllAsRead,
        refetchNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};
