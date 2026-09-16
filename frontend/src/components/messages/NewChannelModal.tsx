"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { ResearchProject, Profile } from "@/types/database";
import { UserPlus, Search, Loader2, Check, MessageSquare, FolderKanban } from "lucide-react";

interface NewChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ResearchProject[];
  onChannelCreated: (channelId: string) => void;
}

export const NewChannelModal: React.FC<NewChannelModalProps> = ({
  isOpen,
  onClose,
  projects,
  onChannelCreated,
}) => {
  const [activeTab, setActiveTab] = useState<"dm" | "group">("dm");
  const [title, setTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [foundUsers, setFoundUsers] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search users dynamically
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (res.ok) {
          setFoundUsers(json.users || []);
        }
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let channelTitle = title.trim();
    if (activeTab === "dm") {
      if (!selectedUser) {
        setError("Please select a researcher to start a discussion.");
        return;
      }
      channelTitle = selectedUser.name;
    } else {
      if (!channelTitle) {
        setError("Please enter a research group topic or name.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/messages/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: channelTitle,
          type: activeTab === "dm" ? "dm" : "project_group",
          targetUserId: selectedUser?.user_id,
          projectId: selectedProjectId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create channel.");
      }

      onChannelCreated(json.channel.id);
      onClose();
      // Reset form
      setTitle("");
      setSelectedUser(null);
      setSelectedProjectId("");
    } catch (err: any) {
      setError(err?.message || "Failed to start discussion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Start Research Discussion"
      description="Connect with peer researchers or establish a research project discussion channel."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("dm")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "dm"
                ? "bg-white text-[#0000CD] shadow-xs"
                : "text-gray-500 hover:text-[#111111]"
            }`}
          >
            Direct Message (1-on-1)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("group")}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === "group"
                ? "bg-white text-[#0000CD] shadow-xs"
                : "text-gray-500 hover:text-[#111111]"
            }`}
          >
            Project Discussion Group
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        {activeTab === "group" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Group Discussion Name
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SONIC Research Team, Methodology Review"
              required
            />
          </div>
        )}

        {/* Link to Research Project (Optional) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold font-heading text-[#111111] flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-[#FF7F00]" />
            Associate Research Project (Optional)
          </label>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
          >
            <option value="">-- No Project Link (General Discussion) --</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* User Search for DMs */}
        {activeTab === "dm" && (
          <div className="space-y-2">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Find Researcher
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search researcher by name or email..."
                className="pl-9"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-[#0000CD] animate-spin absolute right-3 top-3.5" />
              )}
            </div>

            {/* Found Users List */}
            <div className="max-h-48 overflow-y-auto space-y-1 border border-[#E5E7EB] rounded-xl p-1 bg-gray-50/50">
              {foundUsers.length === 0 ? (
                <p className="text-xs text-gray-400 p-3 text-center italic">
                  {searchQuery ? "No researchers found matching query." : "Type to search researchers..."}
                </p>
              ) : (
                foundUsers.map((u) => {
                  const isSelected = selectedUser?.user_id === u.user_id;
                  return (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className={`w-full p-2.5 rounded-lg text-left flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-[#EEF2FF] border border-[#0000CD]/20"
                          : "hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} size="sm" />
                        <div>
                          <p className="text-xs font-bold font-heading text-[#111111]">
                            {u.name}
                          </p>
                          <p className="text-[11px] text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#0000CD]" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Start Discussion"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
