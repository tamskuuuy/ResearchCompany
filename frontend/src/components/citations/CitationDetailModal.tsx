"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { NormalizedCitation, formatAPA, formatIEEE, formatBibTeX } from "@/types/citation";
import {
  ExternalLink,
  Copy,
  Check,
  BookmarkCheck,
  Globe,
  BookOpen,
  Calendar,
  Layers,
  FileCode2,
  ShieldCheck,
} from "lucide-react";

interface CitationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  citation: NormalizedCitation | null;
  onSaveTrigger?: (citation: NormalizedCitation) => void;
}

export const CitationDetailModal: React.FC<CitationDetailModalProps> = ({
  isOpen,
  onClose,
  citation,
  onSaveTrigger,
}) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!citation) return null;

  const handleCopy = (formatType: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatType);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  const apaText = formatAPA(citation);
  const ieeeText = formatIEEE(citation);
  const bibtexText = formatBibTeX(citation);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={citation.title}
      description={citation.authors.join(", ")}
    >
      <div className="space-y-5 py-2 max-h-[75vh] overflow-y-auto pr-1">
        {/* Metadata Badges & Provenance */}
        <div className="flex flex-wrap gap-2 text-xs">
          {citation.publicationYear && (
            <span className="px-2.5 py-1 bg-blue-50 text-[#0000CD] font-bold rounded-lg flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> {citation.publicationYear}
            </span>
          )}
          {citation.journal && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> {citation.journal}
            </span>
          )}
          {citation.isOpenAccess && (
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg">
              Open Access Confirmed
            </span>
          )}
        </div>

        {/* Indexed Sources Badges */}
        <div className="p-3 bg-gray-50 border border-[#E5E7EB] rounded-xl space-y-1 text-xs">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0000CD]" /> Verified Indexed Sources
          </span>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {citation.indexedSources.map((source) => (
              <span
                key={source}
                className="px-2 py-0.5 bg-white border border-[#E5E7EB] text-gray-800 font-semibold rounded-md text-[11px]"
              >
                Source: {source}
              </span>
            ))}
          </div>
        </div>

        {/* DOI Link */}
        {citation.doi && (
          <div className="p-3 bg-gray-50 border border-[#E5E7EB] rounded-xl flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">DOI: {citation.doi}</span>
            <a
              href={`https://doi.org/${citation.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0000CD] hover:underline font-bold flex items-center gap-1"
            >
              Open DOI <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Abstract */}
        {citation.abstract && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold font-heading text-[#111111] uppercase tracking-wider">
              Abstract
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50/50 p-4 rounded-2xl border border-[#E5E7EB]">
              {citation.abstract}
            </p>
          </div>
        )}

        {/* Formatted References Section */}
        <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
          <h4 className="text-xs font-bold font-heading text-[#111111] uppercase tracking-wider">
            Formatted Bibliographies
          </h4>

          {/* APA Format */}
          <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">APA 7th Edition</span>
              <button
                onClick={() => handleCopy("APA", apaText)}
                className="text-xs text-[#0000CD] hover:underline font-semibold flex items-center gap-1"
              >
                {copiedFormat === "APA" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFormat === "APA" ? "Copied" : "Copy APA"}
              </button>
            </div>
            <p className="text-xs text-[#111111] font-mono leading-relaxed">{apaText}</p>
          </div>

          {/* IEEE Format */}
          <div className="p-3 bg-white border border-[#E5E7EB] rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500">IEEE Format</span>
              <button
                onClick={() => handleCopy("IEEE", ieeeText)}
                className="text-xs text-[#0000CD] hover:underline font-semibold flex items-center gap-1"
              >
                {copiedFormat === "IEEE" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFormat === "IEEE" ? "Copied" : "Copy IEEE"}
              </button>
            </div>
            <p className="text-xs text-[#111111] font-mono leading-relaxed">{ieeeText}</p>
          </div>

          {/* BibTeX */}
          <div className="p-3 bg-gray-900 text-gray-100 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <FileCode2 className="w-3.5 h-3.5" /> BibTeX
              </span>
              <button
                onClick={() => handleCopy("BibTeX", bibtexText)}
                className="text-xs text-blue-400 hover:underline font-semibold flex items-center gap-1"
              >
                {copiedFormat === "BibTeX" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFormat === "BibTeX" ? "Copied" : "Copy BibTeX"}
              </button>
            </div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap overflow-x-auto text-emerald-300">
              {bibtexText}
            </pre>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#E5E7EB] mt-4">
        {citation.openAccessUrl || citation.url ? (
          <a
            href={citation.openAccessUrl || citation.url!}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#0000CD] font-bold hover:underline flex items-center gap-1.5"
          >
            <Globe className="w-4 h-4" /> {citation.openAccessUrl ? "Open Access Full Text" : "View Publisher Source"}
          </a>
        ) : (
          <span className="text-xs text-gray-400">Full text availability not confirmed</span>
        )}

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
          {onSaveTrigger && (
            <Button
              variant="primary"
              size="sm"
              icon={<BookmarkCheck className="w-4 h-4" />}
              onClick={() => {
                onClose();
                onSaveTrigger(citation);
              }}
            >
              Save to Project
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
