"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Folder } from "@/types/database";
import { Folder as FolderIcon, AlertCircle, Loader2 } from "lucide-react";

interface MoveFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (targetFolderId: string | null) => Promise<void>;
  fileName: string;
  currentFolderId: string | null;
  folders: Folder[];
}

export const MoveFileModal: React.FC<MoveFileModalProps> = ({
  isOpen,
  onClose,
  onMove,
  fileName,
  currentFolderId,
  folders,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentFolderId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onMove(selectedFolderId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to move file.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move File"
      description={`Select a target folder to move "${fileName}".`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {/* Option: Project Root */}
          <button
            type="button"
            onClick={() => setSelectedFolderId(null)}
            className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-colors ${
              selectedFolderId === null
                ? "border-[#0000CD] bg-blue-50/50 font-bold"
                : "border-[#E5E7EB] hover:bg-gray-50"
            }`}
          >
            <FolderIcon className="w-4 h-4 text-[#0000CD]" />
            <span className="text-xs text-[#111111]">Project Root (No Folder)</span>
          </button>

          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolderId(f.id)}
              className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-colors ${
                selectedFolderId === f.id
                  ? "border-[#0000CD] bg-blue-50/50 font-bold"
                  : "border-[#E5E7EB] hover:bg-gray-50"
              }`}
            >
              <FolderIcon className="w-4 h-4 text-amber-500 fill-amber-500/20" />
              <span className="text-xs text-[#111111] truncate">{f.name}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            disabled={isSubmitting || selectedFolderId === currentFolderId}
          >
            {isSubmitting ? "Moving..." : "Move File"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
