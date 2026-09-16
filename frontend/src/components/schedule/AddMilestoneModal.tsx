"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ResearchProject } from "@/types/database";
import { Flag, FolderKanban, Loader2, Plus } from "lucide-react";

interface AddMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ResearchProject[];
  onMilestoneCreated: () => void;
}

export const AddMilestoneModal: React.FC<AddMilestoneModalProps> = ({
  isOpen,
  onClose,
  projects,
  onMilestoneCreated,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [targetDate, setTargetDate] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedProjectId || !targetDate) return;

    setError(null);
    setIsSubmitting(true);

    const parseIsoDate = (val: string) => {
      if (!val) return undefined;
      const d = new Date(val);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString();
    };

    const parsedTargetDate = parseIsoDate(targetDate);
    if (!parsedTargetDate) {
      setError("Invalid target date selected or typed. Please check the date format.");
      return;
    }

    try {
      const res = await fetch("/api/schedule/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          projectId: selectedProjectId,
          targetDate: parsedTargetDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create milestone.");
      }

      onMilestoneCreated();
      onClose();
      // Reset
      setTitle("");
      setDescription("");
      setSelectedProjectId("");
      setTargetDate("");
    } catch (err: any) {
      console.error("Create milestone error:", err);
      setError(err?.message || "Failed to save milestone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Research Milestone"
      description="Define key project milestones, dataset releases, or submission deadlines."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Milestone Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. NeurIPS 2026 Camera Ready Submission"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111] flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-[#0000CD]" />
              Target Research Project *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
              required
            >
              <option value="">-- Choose Research Project --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Target Date *
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Milestone Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            placeholder="Key deliverables, validation metrics, or submission goals..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            disabled={isSubmitting || !title.trim() || !selectedProjectId || !targetDate}
          >
            {isSubmitting ? "Saving..." : "Save Milestone"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
