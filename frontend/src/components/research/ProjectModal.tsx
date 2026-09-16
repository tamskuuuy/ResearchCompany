"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Loader2 } from "lucide-react";
import { ResearchProject, ProjectStatus } from "@/types/database";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description: string; status: ProjectStatus }) => Promise<void>;
  initialData?: ResearchProject | null;
  mode: "create" | "edit";
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const [title, setTitle] = useState(mode === "edit" && initialData ? initialData.title : "");
  const [description, setDescription] = useState(mode === "edit" && initialData ? initialData.description || "" : "");
  const [status, setStatus] = useState<ProjectStatus>(mode === "edit" && initialData ? initialData.status : "active");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Project title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        status,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save project.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Create New Research Project" : "Edit Research Project"}
      description={
        mode === "create"
          ? "Organize your datasets, literature files, citations, and notes in a dedicated workspace."
          : "Update project metadata and workspace status."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Project Title"
          placeholder="e.g. SONIC — Smart Orientation Navigation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          disabled={isSubmitting}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Description (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Describe the research objective, methodology, or dataset scope..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:border-[#0000CD] focus:ring-2 focus:ring-[#0000CD]/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            Workspace Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            disabled={isSubmitting}
            className="w-full bg-white border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-sm text-[#111111] focus:outline-none focus:border-[#0000CD] focus:ring-2 focus:ring-[#0000CD]/20"
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : mode === "create"
              ? "Create Project"
              : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
