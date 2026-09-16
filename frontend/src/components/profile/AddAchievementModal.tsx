"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Award, Loader2, Plus, ExternalLink } from "lucide-react";

interface AddAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddedSuccess: () => void;
}

export const AddAchievementModal: React.FC<AddAchievementModalProps> = ({
  isOpen,
  onClose,
  onAddedSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [venueOrIssuer, setVenueOrIssuer] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<"publication" | "award" | "grant" | "patent">("publication");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/profile/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          venue_or_issuer: venueOrIssuer.trim() || undefined,
          year: year.trim() || undefined,
          url: url.trim() || undefined,
          category,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add achievement.");
      }

      onAddedSuccess();
      onClose();
      // Reset form
      setTitle("");
      setVenueOrIssuer("");
      setUrl("");
    } catch (err: any) {
      console.error("Add achievement error:", err);
      setError(err?.message || "Failed to save achievement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Research Achievement or Publication"
      description="Manually record peer-reviewed publications, academic awards, research grants, or patents."
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Achievement Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
            className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
          >
            <option value="publication">Peer-Reviewed Publication</option>
            <option value="award">Academic Award / Distinction</option>
            <option value="grant">Research Grant / Funding</option>
            <option value="patent">Intellectual Property / Patent</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Title / Paper Name *
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Dense Vector Indexing for Large Repositories"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Venue / Journal / Issuer
            </label>
            <Input
              value={venueOrIssuer}
              onChange={(e) => setVenueOrIssuer(e.target.value)}
              placeholder="e.g. NeurIPS 2025 Proceedings, NSF"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold font-heading text-[#111111]">
              Year
            </label>
            <Input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="2025"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold font-heading text-[#111111]">
            Publication or Verification Link (URL)
          </label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://doi.org/10.1016/..."
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
            {isSubmitting ? "Adding..." : "Add Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
