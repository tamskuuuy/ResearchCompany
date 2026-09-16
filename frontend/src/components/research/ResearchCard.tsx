"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ResearchProject } from "@/types/database";
import {
  FolderKanban,
  FileText,
  BookmarkCheck,
  Clock,
  MoreVertical,
  Edit3,
  Archive,
  Trash2,
  ArrowRight,
} from "lucide-react";

interface ResearchCardProps {
  project: ResearchProject;
  onEdit: (project: ResearchProject) => void;
  onArchive: (project: ResearchProject) => void;
  onDelete: (project: ResearchProject) => void;
}

export const ResearchCard: React.FC<ResearchCardProps> = ({
  project,
  onEdit,
  onArchive,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const statusBadgeVariant =
    project.status === "active"
      ? "primary"
      : project.status === "completed"
      ? "accent"
      : "neutral";

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Card
      interactive
      hoverHighlight
      className="h-full flex flex-col justify-between p-6 group transition-all duration-200 border-[#E5E7EB] hover:border-[#0000CD]/40 relative"
    >
      <div className="space-y-4">
        {/* Card Header: Icon, Status Badge & Action Menu */}
        <div className="flex items-start justify-between gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0000CD] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
            <FolderKanban className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={statusBadgeVariant} className="capitalize">
              {project.status}
            </Badge>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Project options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setIsMenuOpen(false);
                    }}
                  />
                  <div className="absolute right-0 top-8 z-30 w-36 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 text-xs space-y-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsMenuOpen(false);
                        onEdit(project);
                      }}
                      className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-gray-500" /> Edit Details
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsMenuOpen(false);
                        onArchive(project);
                      }}
                      className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Archive className="w-3.5 h-3.5 text-amber-500" />
                      {project.status === "archived" ? "Unarchive" : "Archive"}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsMenuOpen(false);
                        onDelete(project);
                      }}
                      className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title and Description */}
        <Link href={`/research/${project.id}`} className="block space-y-1.5 group-hover:no-underline">
          <h3 className="text-lg font-bold font-heading text-[#111111] group-hover:text-[#0000CD] transition-colors flex items-center justify-between gap-2">
            <span className="line-clamp-1">{project.title}</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[#0000CD] shrink-0" />
          </h3>
          {project.description ? (
            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          ) : (
            <p className="text-xs text-gray-400 italic">No description provided</p>
          )}
        </Link>
      </div>

      {/* Card Footer: Metadata and Stats */}
      <div className="pt-4 mt-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-gray-400" />
            {project.files_count || 0} files
          </span>
          <span className="flex items-center gap-1">
            <BookmarkCheck className="w-3.5 h-3.5 text-gray-400" />
            {project.citations_count || 0} citations
          </span>
        </div>

        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <Clock className="w-3 h-3" />
          {formatDate(project.updated_at || project.created_at)}
        </span>
      </div>
    </Card>
  );
};
