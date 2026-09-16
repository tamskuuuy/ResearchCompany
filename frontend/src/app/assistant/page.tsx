"use client";

import React, { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContextSelectorModal } from "@/components/assistant/ContextSelectorModal";
import { ConfirmDialog } from "@/components/research/ConfirmDialog";
import { Conversation, Message, ResearchProject, FileItem, Citation } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  Bot,
  Send,
  Plus,
  Trash2,
  Paperclip,
  BookmarkCheck,
  FolderGit2,
  FileText,
  Loader2,
  Sparkles,
  Zap,
  X,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AssistantPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Context Selection States
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedCitationIds, setSelectedCitationIds] = useState<string[]>([]);
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);

  // Context Detail Cache
  const [activeProjectObj, setActiveProjectObj] = useState<ResearchProject | null>(null);
  const [selectedFilesObj, setSelectedFilesObj] = useState<FileItem[]>([]);
  const [selectedCitationsObj, setSelectedCitationsObj] = useState<Citation[]>([]);

  // Modals
  const [deleteTargetConv, setDeleteTargetConv] = useState<Conversation | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Load conversations list
  const fetchConversations = async () => {
    if (!user) return;
    try {
      const { data, error: convErr } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (convErr) throw convErr;
      setConversations(data || []);

      if (data && data.length > 0 && !activeConvId) {
        setActiveConvId(data[0].id);
      }
    } catch (err: any) {
      console.error("Error loading conversations:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [user]);

  // Load messages for active conversation
  const fetchMessages = async (convId: string) => {
    if (!user || !convId) return;
    try {
      const { data, error: msgErr } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      if (msgErr) throw msgErr;
      setMessages(data || []);
    } catch (err: any) {
      console.error("Error loading messages:", err);
    }
  };

  useEffect(() => {
    if (activeConvId) {
      fetchMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId, user]);

  // Load objects for context pills preview
  useEffect(() => {
    if (!user) return;
    const fetchContextDetails = async () => {
      if (selectedProjectId) {
        const { data } = await supabase
          .from("research_projects")
          .select("*")
          .eq("id", selectedProjectId)
          .single();
        setActiveProjectObj(data || null);
      } else {
        setActiveProjectObj(null);
      }

      if (selectedFileIds.length > 0) {
        const { data } = await supabase
          .from("files")
          .select("*")
          .in("id", selectedFileIds);
        setSelectedFilesObj(data || []);
      } else {
        setSelectedFilesObj([]);
      }

      if (selectedCitationIds.length > 0) {
        const { data } = await supabase
          .from("citations")
          .select("*")
          .in("id", selectedCitationIds);
        setSelectedCitationsObj(data || []);
      } else {
        setSelectedCitationsObj([]);
      }
    };

    fetchContextDetails();
  }, [selectedProjectId, selectedFileIds, selectedCitationIds, user]);

  const handleCreateNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setStreamingText("");
    setError(null);
  };

  const handleDeleteConversation = async () => {
    if (!deleteTargetConv) return;
    try {
      const { error: delErr } = await supabase
        .from("conversations")
        .delete()
        .eq("id", deleteTargetConv.id);

      if (delErr) throw delErr;

      if (activeConvId === deleteTargetConv.id) {
        setActiveConvId(null);
        setMessages([]);
      }
      await fetchConversations();
    } catch (err: any) {
      alert(err?.message || "Failed to delete conversation.");
    } finally {
      setDeleteTargetConv(null);
    }
  };

  // Submit AI prompt stream handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isGenerating) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    setError(null);
    setIsGenerating(true);
    setStreamingText("");

    // Optimistically add user message to thread
    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConvId || "temp",
      sender_id: user?.id || "",
      sender_type: "user",
      text: userText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          conversationId: activeConvId || undefined,
          projectId: selectedProjectId || undefined,
          selectedFileIds,
          selectedCitationIds,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "AI service request failed.");
      }

      if (!response.body) throw new Error("ReadableStream not supported.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith("event: init")) {
            const jsonStr = line.replace("event: init\ndata: ", "").trim();
            try {
              const initObj = JSON.parse(jsonStr);
              if (initObj.conversationId) {
                setActiveConvId(initObj.conversationId);
              }
            } catch {}
          } else if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") break;
            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.chunk) {
                accumulatedText += dataObj.chunk;
                setStreamingText(accumulatedText);
              }
            } catch {}
          }
        }
      }

      // Add completed AI response to local messages state
      if (accumulatedText.trim()) {
        const completedAiMsg: Message = {
          id: crypto.randomUUID(),
          conversation_id: activeConvId || "temp",
          sender_id: "ai",
          sender_type: "ai",
          text: accumulatedText.trim(),
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, completedAiMsg]);
      }

      await fetchConversations();
    } catch (err: unknown) {
      console.error("AI send message error:", err);
      const msg = err instanceof Error ? err.message : "AI request failed. Please verify API configuration.";
      setError(msg);
    } finally {
      setIsGenerating(false);
      setStreamingText("");
    }
  };

  const quickPrompts = [
    "Help me structure a literature review methodology",
    "Compare empirical approach across selected citations",
    "Formulate 3 key research questions for this topic",
    "Identify potential limitations in our proposed study",
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="AI Research Assistant"
          description="Contextual AI synthesis across your research projects, files metadata, and saved scholarly citations."
          badge={<Badge variant="primary">Context Index Active</Badge>}
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
          {/* SIDEBAR: Conversation History */}
          <Card className="lg:col-span-1 p-4 flex flex-col justify-between border-[#E5E7EB] h-full overflow-hidden">
            <div className="space-y-3 flex-1 flex flex-col min-h-0">
              <Button
                variant="primary"
                className="w-full justify-center"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleCreateNewChat}
              >
                New Research Chat
              </Button>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 pt-2">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2">
                  History ({conversations.length})
                </h4>

                {loadingHistory ? (
                  <div className="p-4 text-center">
                    <Loader2 className="w-5 h-5 text-[#0000CD] animate-spin mx-auto" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic p-3 text-center">No previous chats.</p>
                ) : (
                  conversations.map((conv) => {
                    const isActive = conv.id === activeConvId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setActiveConvId(conv.id)}
                        className={`p-3 rounded-xl cursor-pointer flex items-center justify-between group transition-colors text-xs ${
                          isActive
                            ? "bg-blue-50 text-[#0000CD] font-bold border border-[#0000CD]/20"
                            : "hover:bg-gray-50 text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MessageSquare className="w-4 h-4 shrink-0 text-[#0000CD]" />
                          <span className="truncate">{conv.title}</span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetConv(conv);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </Card>

          {/* MAIN: Chat & Context Window */}
          <Card className="lg:col-span-3 p-5 flex flex-col justify-between border-[#E5E7EB] h-full overflow-hidden">
            {/* Context Pills Bar */}
            <div className="pb-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px]">
                  Context:
                </span>

                {activeProjectObj ? (
                  <span className="px-2.5 py-1 bg-blue-50 text-[#0000CD] font-bold rounded-lg flex items-center gap-1.5">
                    <FolderGit2 className="w-3.5 h-3.5" /> {activeProjectObj.title}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-600"
                      onClick={() => setSelectedProjectId(null)}
                    />
                  </span>
                ) : (
                  <span className="text-gray-400 italic text-[11px]">No project linked</span>
                )}

                {selectedFilesObj.map((f) => (
                  <span
                    key={f.id}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" /> {f.name}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-600"
                      onClick={() => setSelectedFileIds(selectedFileIds.filter((id) => id !== f.id))}
                    />
                  </span>
                ))}

                {selectedCitationsObj.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 bg-amber-50 text-amber-900 font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" /> {c.title.slice(0, 20)}...
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-red-600"
                      onClick={() => setSelectedCitationIds(selectedCitationIds.filter((id) => id !== c.id))}
                    />
                  </span>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<Paperclip className="w-3.5 h-3.5" />}
                onClick={() => setIsContextModalOpen(true)}
              >
                Attach Context
              </Button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Chat Thread */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {messages.length === 0 && !streamingText && (
                <div className="py-12 text-center space-y-4 max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0000CD] flex items-center justify-center mx-auto">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold font-heading text-[#111111]">
                      ResearchCompany AI Assistant Ready
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Ask questions, organize literature reviews, or synthesize methodology across your attached project context.
                    </p>
                  </div>

                  {/* Suggested Prompts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                    {quickPrompts.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => setInputMessage(q)}
                        className="p-3 bg-gray-50 hover:bg-blue-50/50 hover:border-[#0000CD]/40 border border-[#E5E7EB] rounded-xl text-xs text-gray-700 font-medium transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => {
                const isUser = msg.sender_type === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                        isUser ? "bg-gray-900 text-white" : "bg-blue-50 text-[#0000CD]"
                      }`}
                    >
                      {isUser ? "U" : <Bot className="w-4 h-4" />}
                    </div>

                    <div
                      className={`p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed space-y-1 ${
                        isUser
                          ? "bg-[#0000CD] text-white rounded-tr-none font-medium"
                          : "bg-gray-50 border border-[#E5E7EB] text-[#111111] rounded-tl-none font-sans whitespace-pre-wrap"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                );
              })}

              {/* Streaming Assistant Response Chunk */}
              {isGenerating && streamingText && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0000CD] flex items-center justify-center shrink-0 text-xs font-bold">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl max-w-[80%] text-xs leading-relaxed bg-gray-50 border border-[#E5E7EB] text-[#111111] rounded-tl-none font-sans whitespace-pre-wrap">
                    {streamingText}
                  </div>
                </div>
              )}

              {isGenerating && !streamingText && (
                <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                  <Loader2 className="w-4 h-4 animate-spin text-[#0000CD]" />
                  <span>ResearchCompany AI is thinking...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Prompt Box */}
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-[#E5E7EB] flex items-center gap-3">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask ResearchCompany AI or type research prompt..."
                className="flex-1 bg-white border border-[#E5E7EB] rounded-xl px-4 py-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD] placeholder:text-gray-400"
                disabled={isGenerating}
              />
              <Button
                variant="primary"
                type="submit"
                icon={isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                disabled={isGenerating || !inputMessage.trim()}
              >
                Send
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Context Selector Modal */}
      <ContextSelectorModal
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        selectedProjectId={selectedProjectId}
        selectedFileIds={selectedFileIds}
        selectedCitationIds={selectedCitationIds}
        onApplyContext={(proj, files, cits) => {
          setSelectedProjectId(proj);
          setSelectedFileIds(files);
          setSelectedCitationIds(cits);
        }}
      />

      {/* Delete Conversation Confirm */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetConv)}
        onClose={() => setDeleteTargetConv(null)}
        onConfirm={handleDeleteConversation}
        title="Delete AI Conversation?"
        description={`Permanently delete "${deleteTargetConv?.title}" and all nested chat messages?`}
        confirmText="Confirm Delete"
        isDangerous
      />
    </AppLayout>
  );
}
