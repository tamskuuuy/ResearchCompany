"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { UserSettings } from "@/types/database";
import { useAuth } from "@/context/AuthContext";
import {
  Settings as SettingsIcon,
  Sliders,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Moon,
  Sparkles,
  Database,
  Lock,
  Globe,
  Clock,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";

type CategoryTab = "general" | "ai" | "notifications" | "security";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeCategory, setActiveCategory] = useState<CategoryTab>("general");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // User Settings State
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    default_project_visibility: "private",
    default_task_priority: "MEDIUM",
    default_task_status: "TODO",
    default_citation_format: "APA",
    timezone: "UTC",
    timeline_view: "MONTH",
    ai_provider: "auto",
    ai_model: "gpt-4o-mini",
    ai_temperature: 0.7,
    retrieval_enabled: true,
    top_k: 8,
    similarity_threshold: 0.70,
    response_style: "balanced",
    include_citations_by_default: true,
    prefer_project_context: true,
    notify_messages: true,
    notify_task_assignments: true,
    notify_deadlines: true,
    notify_milestones: true,
    in_app_notifications: true,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00",
    quiet_hours_end: "08:00",
  });

  // Fetch initial user settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setIsLoading(true);
        const res = await fetch("/api/settings");
        const data = await res.json();
        if (res.ok && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      fetchSettings();
    }
  }, [user]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings.");
      }

      if (data.settings) {
        setSettings(data.settings);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save settings error:", err);
      setError(err?.message || "Failed to save configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (key: keyof UserSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Workspace Settings & Configuration"
          description="Configure general workspace parameters, AI retrieval preferences, notification alerts, and security controls."
          badge={
            saveSuccess ? (
              <Badge variant="success" className="animate-bounce">
                <CheckCircle2 className="w-3 h-3 inline mr-1" /> Settings Persisted
              </Badge>
            ) : (
              <Badge variant="primary">System Config</Badge>
            )
          }
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              onClick={() => handleSave()}
              disabled={isSaving || isLoading}
            >
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          }
        />

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Categories Navigation */}
          <Card className="p-3 border-[#E5E7EB] space-y-1 h-fit">
            {[
              { id: "general", label: "General Workspace", icon: SettingsIcon },
              { id: "ai", label: "AI & Retrieval", icon: Sliders },
              { id: "notifications", label: "Notifications & Alerts", icon: Bell },
              { id: "security", label: "Security & Access", icon: Shield },
            ].map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as CategoryTab)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs font-semibold transition-all text-left ${
                    isActive
                      ? "bg-[#EEF2FF] text-[#0000CD] font-bold shadow-2xs"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#0000CD]" : "text-gray-400"}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </Card>

          {/* Form Settings Details Panel */}
          <Card className="lg:col-span-3 p-6 border-[#E5E7EB] space-y-6">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#0000CD]" />
                <span>Loading configuration preferences...</span>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-6">
                {/* 1. GENERAL WORKSPACE CATEGORY */}
                {activeCategory === "general" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="pb-3 border-b border-[#E5E7EB]">
                      <h3 className="text-lg font-bold font-heading text-[#111111]">General Workspace Defaults</h3>
                      <p className="text-xs text-gray-500">Configure task status defaults, citation export formats, and timeline parameters.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          Default Project Visibility
                        </label>
                        <select
                          value={settings.default_project_visibility}
                          onChange={(e) => handleFieldChange("default_project_visibility", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="private">Private (Only owner access)</option>
                          <option value="team">Team Collaboration (Members only)</option>
                          <option value="public">Public (Viewable by researchers)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          Default Citation Format
                        </label>
                        <select
                          value={settings.default_citation_format}
                          onChange={(e) => handleFieldChange("default_citation_format", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="APA">APA 7th Edition</option>
                          <option value="MLA">MLA 9th Edition</option>
                          <option value="IEEE">IEEE Reference Style</option>
                          <option value="Chicago">Chicago Manual of Style</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          Default Task Priority
                        </label>
                        <select
                          value={settings.default_task_priority}
                          onChange={(e) => handleFieldChange("default_task_priority", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="LOW">Low Priority</option>
                          <option value="MEDIUM">Medium Priority</option>
                          <option value="HIGH">High Priority</option>
                          <option value="URGENT">Urgent Deadline</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          Default Timeline Zoom Level
                        </label>
                        <select
                          value={settings.timeline_view}
                          onChange={(e) => handleFieldChange("timeline_view", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="DAY">Day Scale (Hourly precision)</option>
                          <option value="WEEK">Week Scale (Daily precision)</option>
                          <option value="MONTH">Month Scale (Overview)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          Workspace Timezone
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => handleFieldChange("timezone", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="UTC">UTC (Coordinated Universal Time)</option>
                          <option value="America/New_York">Eastern Time (US & Canada)</option>
                          <option value="Europe/London">Greenwich Mean Time (London)</option>
                          <option value="Asia/Tokyo">Japan Standard Time (Tokyo)</option>
                          <option value="Asia/Jakarta">Western Indonesia Time (Jakarta)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 2. AI & RETRIEVAL CATEGORY */}
                {activeCategory === "ai" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="pb-3 border-b border-[#E5E7EB]">
                      <h3 className="text-lg font-bold font-heading text-[#111111]">AI Assistant & RAG Parameters</h3>
                      <p className="text-xs text-gray-500">Customize AI model selection, semantic search match limits, similarity thresholds, and output styles.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          AI Service Provider
                        </label>
                        <select
                          value={settings.ai_provider}
                          onChange={(e) => handleFieldChange("ai_provider", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="auto">Auto Select (Server API Key Config)</option>
                          <option value="openrouter">OpenRouter API</option>
                          <option value="openai">OpenAI Official API</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          AI Model Engine
                        </label>
                        <select
                          value={settings.ai_model}
                          onChange={(e) => handleFieldChange("ai_model", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="gpt-4o-mini">GPT-4o Mini (Fast & Research Optimized)</option>
                          <option value="gpt-4o">GPT-4o (High Precision Research)</option>
                          <option value="openai/gpt-4o-mini">OpenRouter GPT-4o-Mini</option>
                          <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet (OpenRouter)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          Response Style & Density
                        </label>
                        <select
                          value={settings.response_style}
                          onChange={(e) => handleFieldChange("response_style", e.target.value)}
                          className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-xs text-[#111111] focus:outline-none focus:border-[#0000CD]"
                        >
                          <option value="concise">Concise & Direct (High density summaries)</option>
                          <option value="balanced">Balanced (Structured overview with citations)</option>
                          <option value="detailed">Detailed Academic (Full analytical breakdown)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          RAG Top K Chunks ({settings.top_k || 8} chunks)
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="20"
                          value={settings.top_k || 8}
                          onChange={(e) => handleFieldChange("top_k", parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0000CD]"
                        />
                        <span className="text-[10px] text-gray-400 font-semibold">Number of retrieved document chunks per prompt.</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-gray-700 font-heading">
                          Similarity Match Threshold ({((settings.similarity_threshold || 0.7) * 100).toFixed(0)}%)
                        </label>
                        <input
                          type="range"
                          min="0.30"
                          max="0.95"
                          step="0.05"
                          value={settings.similarity_threshold || 0.70}
                          onChange={(e) => handleFieldChange("similarity_threshold", parseFloat(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0000CD]"
                        />
                        <span className="text-[10px] text-gray-400 font-semibold">Minimum cosine similarity score required for RAG chunk retrieval.</span>
                      </div>
                    </div>

                    <div className="pt-2 space-y-3 border-t border-[#E5E7EB]">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.retrieval_enabled ?? true}
                          onChange={(e) => handleFieldChange("retrieval_enabled", e.target.checked)}
                          className="w-4 h-4 text-[#0000CD] rounded-md border-gray-300 focus:ring-[#0000CD]"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#111111] block">Enable Semantic RAG Document Retrieval</span>
                          <span className="text-[11px] text-gray-500">Automatically retrieve relevant chunks from indexed PDF research files during AI conversations.</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.include_citations_by_default ?? true}
                          onChange={(e) => handleFieldChange("include_citations_by_default", e.target.checked)}
                          className="w-4 h-4 text-[#0000CD] rounded-md border-gray-300 focus:ring-[#0000CD]"
                        />
                        <div>
                          <span className="text-xs font-bold text-[#111111] block">Include Saved Citations in AI Context</span>
                          <span className="text-[11px] text-gray-500">Inject project saved citations to guarantee citation safety and inline source references.</span>
                        </div>
                      </label>
                    </div>
                  </motion.div>
                )}

                {/* 3. NOTIFICATIONS CATEGORY */}
                {activeCategory === "notifications" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="pb-3 border-b border-[#E5E7EB]">
                      <h3 className="text-lg font-bold font-heading text-[#111111]">Notifications & Alert Delivery</h3>
                      <p className="text-xs text-gray-500">Control alert triggers for researcher messages, task deadlines, and milestone schedules.</p>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#111111] block">Direct Message Notifications</span>
                          <span className="text-[11px] text-gray-500">Receive in-app alerts when another researcher sends you a direct message.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notify_messages ?? true}
                          onChange={(e) => handleFieldChange("notify_messages", e.target.checked)}
                          className="w-4 h-4 text-[#0000CD] rounded-md border-gray-300 focus:ring-[#0000CD]"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#111111] block">Research Task Assignments</span>
                          <span className="text-[11px] text-gray-500">Alert me when a task in a research project is assigned to my profile.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notify_task_assignments ?? true}
                          onChange={(e) => handleFieldChange("notify_task_assignments", e.target.checked)}
                          className="w-4 h-4 text-[#0000CD] rounded-md border-gray-300 focus:ring-[#0000CD]"
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer">
                        <div>
                          <span className="text-xs font-bold text-[#111111] block">Task Deadline & Overdue Alerts</span>
                          <span className="text-[11px] text-gray-500">Notify me when research tasks approach their due date or become overdue.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.notify_deadlines ?? true}
                          onChange={(e) => handleFieldChange("notify_deadlines", e.target.checked)}
                          className="w-4 h-4 text-[#0000CD] rounded-md border-gray-300 focus:ring-[#0000CD]"
                        />
                      </label>

                      <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.quiet_hours_enabled ?? false}
                            onChange={(e) => handleFieldChange("quiet_hours_enabled", e.target.checked)}
                            className="w-4 h-4 text-[#0000CD] rounded-md border-gray-300 focus:ring-[#0000CD]"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#111111] block">Enable Quiet Hours</span>
                            <span className="text-[11px] text-gray-500">Suppress non-urgent sound and popups during specified research quiet hours.</span>
                          </div>
                        </label>

                        {settings.quiet_hours_enabled && (
                          <div className="grid grid-cols-2 gap-3 pl-7 pt-1">
                            <div>
                              <span className="text-[10px] font-semibold text-gray-400 block mb-1">Start Time</span>
                              <input
                                type="time"
                                value={settings.quiet_hours_start || "22:00"}
                                onChange={(e) => handleFieldChange("quiet_hours_start", e.target.value)}
                                className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2 text-xs"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] font-semibold text-gray-400 block mb-1">End Time</span>
                              <input
                                type="time"
                                value={settings.quiet_hours_end || "08:00"}
                                onChange={(e) => handleFieldChange("quiet_hours_end", e.target.value)}
                                className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 4. SECURITY & ACCESS CATEGORY */}
                {activeCategory === "security" && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="pb-3 border-b border-[#E5E7EB]">
                      <h3 className="text-lg font-bold font-heading text-[#111111]">Security & Access Management</h3>
                      <p className="text-xs text-gray-500">Manage active authenticated sessions, access control rules, and security credentials.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#0000CD] font-heading">Authenticated Session</span>
                          <Badge variant="success">Active</Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          Signed in as <strong className="text-[#111111]">{user?.email}</strong>
                        </p>
                      </div>

                      <div className="pt-2 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-bold text-[#111111] block">Sign Out Session</span>
                          <span className="text-[11px] text-gray-500">Safely log out of your ResearchCompany workspace on this browser.</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<LogOut className="w-4 h-4 text-red-600" />}
                          onClick={() => logout()}
                        >
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Save Bar */}
                <div className="pt-4 flex items-center justify-between border-t border-[#E5E7EB]">
                  <span className="text-[11px] text-gray-400">Settings changes persist to Supabase cloud storage.</span>
                  <Button
                    variant="primary"
                    type="submit"
                    icon={isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    disabled={isSaving || isLoading}
                  >
                    {isSaving ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
