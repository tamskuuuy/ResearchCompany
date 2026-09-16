"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ResearchProject, ResearchMilestone, TaskPriority, TaskStatus } from "@/types/database";
import { CheckSquare, Calendar, FolderKanban, Flag, Loader2, Plus } from "lucide-react";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ResearchProject[];
  milestones: ResearchMilestone[];
  onTaskCreated: () => void;
  initialProjectId?: string;
  initialStartAt?: string;
  initialDueAt?: string;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  projects,
  milestones,
  onTaskCreated,
  initialProjectId = "",
  initialStartAt = "",
  initialDueAt = "",
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [status, setStatus] = useState<TaskStatus>("TODO");
  const [startAt, setStartAt] = useState(initialStartAt);
  const [dueAt, setDueAt] = useState(initialDueAt);

  React.useEffect(() => {
    if (isOpen) {
      if (initialProjectId) setSelectedProjectId(initialProjectId);
      if (initialStartAt) setStartAt(initialStartAt);
      if (initialDueAt) setDueAt(initialDueAt);
    }
  }, [isOpen, initialProjectId, initialStartAt, initialDueAt]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setIsSubmitting(true);

    const parseIsoDate = (val: string) => {
      if (!val) return undefined;
      const d = new Date(val);
      return isNaN(d.getTime()) ? undefined : d.toISOString();
    };

    const startIso = parseIsoDate(startAt);
    const dueIso = parseIsoDate(dueAt);

    try {
      const res = await fetch("/api/schedule/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          projectId: selectedProjectId || undefined,
          milestoneId: selectedMilestoneId || undefined,
          priority,
          status,
          startAt: startIso,
          dueAt: dueIso,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create task.");
      }

      onTaskCreated();
      onClose();
      // Reset
      setTitle("");
      setDescription("");
      setSelectedProjectId("");
      setSelectedMilestoneId("");
      setStartAt("");
      setDueAt("");
    } catch (err: any) {
      console.error("Create task error:", err);
      setError(err?.message || "Failed to save research task.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMilestones = selectedProjectId
    ? milestones.filter((m) => m.project_id === selectedProjectId)
    : milestones;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Research Task"
      description="Add an actionable task to your research timeline and project workflow."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Task Title *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Configure ESP32-CAM sensor calibration"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111] flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-[#0000CD]" />
              Research Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            >
              <option value="">-- Personal / Independent Task --</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111] flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-[#FF7F00]" />
              Milestone Link
            </label>
            <select
              value={selectedMilestoneId}
              onChange={(e) => setSelectedMilestoneId(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            >
              <option value="">-- No Milestone Link --</option>
              {filteredMilestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Priority Level
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent Deadline</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Initial Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            >
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="BLOCKED">Blocked</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Due Date & Time
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Task Description / Instructions
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
            placeholder="Details, dataset links, environment parameters, or execution steps..."
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
            disabled={isSubmitting || !title.trim()}
          >
            {isSubmitting ? "Saving..." : "Create Task"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
