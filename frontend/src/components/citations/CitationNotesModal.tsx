"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Citation } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Loader2, Save } from "lucide-react";

interface CitationNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: Citation | null;
  onSavedSuccess: () => void;
}

export const CitationNotesModal: React.FC<CitationNotesModalProps> = ({
  isOpen,
  onClose,
  citation,
  onSavedSuccess,
}) => {
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (citation) {
      setNotes(citation.notes || "");
      setError(null);
    }
  }, [citation, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citation) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateErr } = await supabase
        .from("citations")
        .update({
          notes: notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", citation.id);

      if (updateErr) throw updateErr;

      onSavedSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error saving citation notes:", err);
      setError(err?.message || "Failed to save private research notes.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Private Citation Notes"
      description={`Add personal methodology notes or research takeaways for "${citation?.title}".`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Research Notes & Observations
          </label>
          <textarea
            rows={5}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Useful methodology for ultrasonic obstacle detection. Compare with baseline in Section 3..."
            className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD] placeholder:text-gray-400"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            icon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving Notes..." : "Save Notes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
