"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Loader2 } from "lucide-react";
import { Folder } from "@/types/database";

interface FolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  initialData?: Folder | null;
  mode: "create" | "rename";
}

export const FolderModal: React.FC<FolderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode,
}) => {
  const [name, setName] = useState(mode === "rename" && initialData ? initialData.name : "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Folder name cannot be blank.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(name.trim());
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save folder.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "create" ? "Create New Folder" : "Rename Folder"}
      description={
        mode === "create"
          ? "Create a sub-folder to structure your literature files and experiment data."
          : "Update the folder display name."
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
          label="Folder Name"
          placeholder="e.g. Literature Review, Datasets, Experiments"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isSubmitting}
        />

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
              ? "Create Folder"
              : "Rename Folder"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
