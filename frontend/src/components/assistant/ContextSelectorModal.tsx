"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ResearchProject, FileItem, Citation } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { FolderGit2, FileText, BookmarkCheck, Check } from "lucide-react";

interface ContextSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProjectId: string | null;
  selectedFileIds: string[];
  selectedCitationIds: string[];
  onApplyContext: (
    projectId: string | null,
    fileIds: string[],
    citationIds: string[]
  ) => void;
}

export const ContextSelectorModal: React.FC<ContextSelectorModalProps> = ({
  isOpen,
  onClose,
  selectedProjectId,
  selectedFileIds,
  selectedCitationIds,
  onApplyContext,
}) => {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);

  const [localProjectId, setLocalProjectId] = useState<string | null>(selectedProjectId);
  const [localFileIds, setLocalFileIds] = useState<string[]>(selectedFileIds);
  const [localCitationIds, setLocalCitationIds] = useState<string[]>(selectedCitationIds);

  const { user } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (!user || !isOpen) return;
    setLocalProjectId(selectedProjectId);
    setLocalFileIds(selectedFileIds);
    setLocalCitationIds(selectedCitationIds);

    const loadContextOptions = async () => {
      // 1. Projects
      const { data: pData } = await supabase
        .from("research_projects")
        .select("*")
        .eq("owner_id", user.id);
      setProjects(pData || []);

      // 2. Files
      const { data: fData } = await supabase
        .from("files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setFiles(fData || []);

      // 3. Citations
      const { data: cData } = await supabase
        .from("citations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setCitations(cData || []);
    };

    loadContextOptions();
  }, [user, isOpen]);

  const toggleFile = (id: string) => {
    if (localFileIds.includes(id)) {
      setLocalFileIds(localFileIds.filter((f) => f !== id));
    } else {
      if (localFileIds.length >= 5) {
        alert("Maximum 5 file metadata records allowed per session.");
        return;
      }
      setLocalFileIds([...localFileIds, id]);
    }
  };

  const toggleCitation = (id: string) => {
    if (localCitationIds.includes(id)) {
      setLocalCitationIds(localCitationIds.filter((c) => c !== id));
    } else {
      if (localCitationIds.length >= 5) {
        alert("Maximum 5 saved citations allowed per session.");
        return;
      }
      setLocalCitationIds([...localCitationIds, id]);
    }
  };

  const handleSave = () => {
    onApplyContext(localProjectId, localFileIds, localCitationIds);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attach Research Context"
      description="Select research project, file metadata, and saved citations to guide the AI assistant."
    >
      <div className="space-y-5 py-2 max-h-[70vh] overflow-y-auto pr-1">
        {/* Project Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold font-heading text-[#111111] flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5 text-[#0000CD]" /> Active Research Project
          </label>
          <select
            value={localProjectId || ""}
            onChange={(e) => setLocalProjectId(e.target.value || null)}
            className="w-full bg-white border border-[#E5E7EB] rounded-xl p-2.5 text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0000CD]"
          >
            <option value="">No Active Project (Global Session)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        {/* File Metadata Selector */}
        <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
          <label className="text-xs font-bold font-heading text-[#111111] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600" /> Files Metadata ({localFileIds.length}/5)
            </span>
            <span className="text-[11px] text-gray-400 font-normal">Select up to 5</span>
          </label>

          {files.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No files available in Research Files.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {files.map((f) => {
                const isSelected = localFileIds.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => toggleFile(f.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "border-[#0000CD] bg-blue-50/50 font-bold"
                        : "border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate pr-2">{f.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0000CD] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Citations Selector */}
        <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
          <label className="text-xs font-bold font-heading text-[#111111] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" /> Saved Citations ({localCitationIds.length}/5)
            </span>
            <span className="text-[11px] text-gray-400 font-normal">Select up to 5</span>
          </label>

          {citations.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No saved citations available in Citation Manager.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {citations.map((c) => {
                const isSelected = localCitationIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCitation(c.id)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "border-[#0000CD] bg-blue-50/50 font-bold"
                        : "border-[#E5E7EB] hover:bg-gray-50"
                    }`}
                  >
                    <span className="truncate pr-2">{c.title} ({c.authors})</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#0000CD] shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
        <Button variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" type="button" onClick={handleSave}>
          Apply Context
        </Button>
      </div>
    </Modal>
  );
};
