"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { NormalizedCitation, formatAPA, formatBibTeX } from "@/types/citation";
import { ResearchProject } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { BookmarkCheck, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

interface SaveCitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: NormalizedCitation | null;
  projects: ResearchProject[];
  onSavedSuccess?: () => void;
}

export const SaveCitationModal: React.FC<SaveCitationModalProps> = ({
  isOpen,
  onClose,
  citation,
  projects,
  onSavedSuccess,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !citation) return;
    if (!selectedProjectId) {
      setError("Please select a target research project.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      // 1. Check for duplicate DOI in target project
      if (citation.doi) {
        const { data: dupData } = await supabase
          .from("citations")
          .select("id")
          .eq("project_id", selectedProjectId)
          .eq("doi", citation.doi)
          .maybeSingle();

        if (dupData) {
          setError("Already saved to this research project.");
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Prepare formatted strings
      const authorsStr = citation.authors.join(", ");
      const yearStr = citation.publicationYear ? citation.publicationYear.toString() : "";
      const apaFormatted = formatAPA(citation);
      const bibtexFormatted = formatBibTeX(citation);

      // 3. Insert into Supabase public.citations table
      const citationPayload: Record<string, any> = {
        project_id: selectedProjectId,
        user_id: user.id,
        title: citation.title,
        authors: authorsStr,
        journal: citation.journal || null,
        year: yearStr,
        doi: citation.doi || null,
        apa: apaFormatted,
        bibtex: bibtexFormatted,
        citations_count: citation.citationCount || 0,
        source_provider: citation.provider || citation.sourceProvider || "openalex",
        provider: citation.provider || "openalex",
        provider_id: citation.providerId || citation.externalId || null,
        external_id: citation.providerId || citation.externalId || null,
        publication_year: citation.publicationYear || null,
        publisher: citation.publisher || null,
        url: citation.url || null,
        abstract: citation.abstract || null,
        is_open_access: citation.isOpenAccess || false,
      };

      const { error: insertErr } = await supabase.from("citations").insert([citationPayload]);

      if (insertErr) {
        if (insertErr.code === "23505") {
          setError("Already saved to this research project.");
        } else {
          setError(insertErr.message || "Database insert error.");
        }
      } else {
        setSuccessMsg("Citation saved successfully with full provenance tracking.");
        setTimeout(() => {
          onClose();
          if (onSavedSuccess) onSavedSuccess();
        }, 1200);
      }
    } catch (err: any) {
      console.error("Save citation error:", err?.message || err);
      setError(err?.message || "Failed to save citation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Save Citation to Project"
      description={`Add "${citation?.title || "paper"}" to your project literature list.`}
    >
      <form onSubmit={handleSave} className="space-y-4 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-1">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <p className="text-xs font-bold text-emerald-900">{successMsg}</p>
          </div>
        )}

        {!successMsg && (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-bold font-heading text-[#111111]">
                Select Target Research Project
              </label>
              {projects.length === 0 ? (
                <p className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded-xl">
                  No active research projects found. Please create a project first under Research Files.
                </p>
              ) : (
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-xl p-3 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
                  required
                >
                  <option value="">-- Choose Research Project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon={
                  isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <BookmarkCheck className="w-4 h-4" />
                  )
                }
                disabled={isSubmitting || !selectedProjectId || projects.length === 0}
              >
                {isSubmitting ? "Saving..." : "Save Citation"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
