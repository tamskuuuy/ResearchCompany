"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { SearchInput } from "@/components/ui/SearchInput";
import { NewChannelModal } from "@/components/messages/NewChannelModal";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { ResearchProject, Profile } from "@/types/database";
import {
  MessageSquare,
  Send,
  UserPlus,
  FolderKanban,
  Hash,
  Clock,
  Loader2,
  AlertCircle,
  Users,
  CheckCheck,
} from "lucide-react";
import { motion } from "framer-motion";

export interface ChannelItem {
  id: string;
  project_id: string | null;
  created_by: string;
  title: string;
  type: "dm" | "project_group";
  created_at: string;
  updated_at: string;
  members: Profile[];
  latestMessage?: {
    id: string;
    content: string;
    created_at: string;
    sender_id: string;
  } | null;
  unreadCount: number;
  research_projects?: {
    id: string;
    title: string;
    status: string;
  } | null;
}

export interface UserMessageItem {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: Profile;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserMessageItem[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch user channels & research projects
  const fetchChannelsAndProjects = async () => {
    try {
      setIsLoadingChannels(true);
      const [chanRes, projRes] = await Promise.all([
        fetch("/api/messages/channels"),
        supabase.from("research_projects").select("*").order("updated_at", { ascending: false }),
      ]);

      const chanData = await chanRes.json();
      if (chanRes.ok) {
        const fetchedChannels: ChannelItem[] = chanData.channels || [];
        setChannels(fetchedChannels);

        // Auto-select first channel if none selected
        if (fetchedChannels.length > 0 && !activeChannelId) {
          setActiveChannelId(fetchedChannels[0].id);
        }
      }

      if (projRes.data) {
        setProjects(projRes.data as ResearchProject[]);
      }
    } catch (err) {
      console.error("Failed to load messaging workspace:", err);
      setError("Failed to load channels.");
    } finally {
      setIsLoadingChannels(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchChannelsAndProjects();
    }
  }, [user]);

  // 2. Fetch messages when activeChannelId changes
  const fetchMessages = async (channelId: string) => {
    setIsLoadingMessages(true);
    setError(null);
    try {
      const res = await fetch(`/api/messages/${channelId}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load channel messages.");
      }

      setMessages(data.messages || []);

      // Decrement unread count for current channel locally
      setChannels((prev) =>
        prev.map((c) => (c.id === channelId ? { ...c, unreadCount: 0 } : c))
      );
    } catch (err: any) {
      console.error("Fetch messages error:", err);
      setError(err?.message || "Failed to load thread.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (activeChannelId) {
      fetchMessages(activeChannelId);
    }
  }, [activeChannelId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 3. Supabase Realtime Subscription for live messages
  useEffect(() => {
    if (!activeChannelId) return;

    const channel = supabase
      .channel(`realtime_messages_${activeChannelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_messages",
          filter: `channel_id=eq.${activeChannelId}`,
        },
        (payload) => {
          const newMsg = payload.new as UserMessageItem;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannelId, supabase]);

  // 4. Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChannelId || isSending) return;

    const content = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/messages/${activeChannelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send message.");
      }

      // Optimistic append if not instantly delivered by realtime
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });

      // Refresh channels roster order & previews
      fetchChannelsAndProjects();
    } catch (err: any) {
      console.error("Send message error:", err);
      setError(err?.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const totalUnread = channels.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const filteredChannels = channels.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.research_projects?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Researcher Collaboration Workspace"
          description="Direct peer-to-peer discussion, research annotations, and project team messaging."
          badge={
            totalUnread > 0 ? (
              <Badge variant="accent">{totalUnread} Unread Messages</Badge>
            ) : (
              <Badge variant="primary">Realtime Connected</Badge>
            )
          }
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsModalOpen(true)}
            >
              Start Discussion
            </Button>
          }
        />

        {/* Messaging Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[640px]">
          {/* Left Channel Roster Panel */}
          <Card className="p-4 flex flex-col border-[#E5E7EB] space-y-4 h-full">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search team channels & research projects..."
            />

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Active Channels & DMs
                </span>
                <span className="text-[10px] text-[#0000CD] font-bold">
                  {channels.length} Total
                </span>
              </div>

              {isLoadingChannels ? (
                <div className="p-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0000CD]" />
                  <span>Loading workspace channels...</span>
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="p-6 text-center space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 my-2">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-500 font-medium">No active channels found.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Start First Discussion
                  </Button>
                </div>
              ) : (
                filteredChannels.map((c) => {
                  const isActive = activeChannelId === c.id;
                  const isGroup = c.type === "project_group";

                  return (
                    <button
                      key={c.id}
                      onClick={() => setActiveChannelId(c.id)}
                      className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? "bg-[#EEF2FF] border border-[#0000CD]/25 shadow-2xs"
                          : "hover:bg-gray-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isGroup ? (
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0000CD] font-bold flex items-center justify-center shrink-0 border border-blue-100">
                            <Hash className="w-4 h-4" />
                          </div>
                        ) : (
                          <Avatar
                            name={c.title}
                            status="online"
                            size="sm"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold font-heading text-[#111111] truncate">
                              {c.title}
                            </p>
                          </div>

                          {c.research_projects ? (
                            <p className="text-[10px] font-semibold text-[#FF7F00] truncate flex items-center gap-1 mt-0.5">
                              <FolderKanban className="w-2.5 h-2.5 shrink-0" />
                              {c.research_projects.title}
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              {c.latestMessage?.content || "No messages yet."}
                            </p>
                          )}
                        </div>
                      </div>

                      {c.unreadCount > 0 && (
                        <Badge variant="accent" className="px-2 py-0.5 text-[10px] shrink-0">
                          {c.unreadCount}
                        </Badge>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right Message Thread Panel */}
          <Card className="lg:col-span-2 p-0 flex flex-col border-[#E5E7EB] overflow-hidden h-full">
            {activeChannel ? (
              <>
                {/* Thread Header */}
                <div className="p-4 bg-gray-50/80 border-b border-[#E5E7EB] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#0000CD] text-white flex items-center justify-center font-bold">
                      {activeChannel.type === "project_group" ? <Hash className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold font-heading text-[#111111] flex items-center gap-2">
                        {activeChannel.title}
                        {activeChannel.research_projects && (
                          <Badge variant="outline" className="text-[10px]">
                            {activeChannel.research_projects.title}
                          </Badge>
                        )}
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        {activeChannel.members?.length || 1} Participant(s) active
                      </p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="m-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Chat History Container */}
                <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gradient-to-b from-white to-[#F6F7F9]/50">
                  {isLoadingMessages ? (
                    <div className="h-full flex items-center justify-center text-xs text-gray-400 gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-[#0000CD]" />
                      <span>Loading message thread...</span>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-2 text-gray-400">
                      <MessageSquare className="w-10 h-10 text-gray-300" />
                      <p className="text-xs font-semibold text-gray-600">No messages in this discussion yet.</p>
                      <p className="text-[11px] text-gray-400 max-w-xs">
                        Start the research discussion by sending a message below.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isUser = msg.sender_id === user?.id;
                      const timeFormatted = new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={msg.id}
                          className={`flex gap-3 max-w-xl ${isUser ? "ml-auto flex-row-reverse" : ""}`}
                        >
                          <Avatar name={isUser ? "Me" : "Peer Researcher"} size="sm" />
                          <div className={`space-y-1 ${isUser ? "text-right" : ""}`}>
                            <div className="flex items-center gap-2 mb-1 justify-end">
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                {timeFormatted}
                              </span>
                            </div>
                            <div
                              className={`p-3.5 rounded-2xl text-sm leading-relaxed text-left ${
                                isUser
                                  ? "bg-[#0000CD] text-white shadow-xs"
                                  : "bg-white border border-[#E5E7EB] text-[#111111] shadow-xs"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Composer Footer */}
                <div className="p-4 bg-white border-t border-[#E5E7EB]">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={`Message ${activeChannel.title}...`}
                        className="bg-gray-50 border-gray-200 focus:bg-white"
                      />
                    </div>
                    <Button
                      variant="primary"
                      type="submit"
                      icon={
                        isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )
                      }
                      disabled={isSending || !inputText.trim()}
                    >
                      Send
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <MessageSquare className="w-12 h-12 text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">Select a discussion channel to view messages.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Modal for creating new DM or Project Group channel */}
        <NewChannelModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          projects={projects}
          onChannelCreated={(newChanId) => {
            fetchChannelsAndProjects();
            setActiveChannelId(newChanId);
          }}
        />
      </div>
    </AppLayout>
  );
}
