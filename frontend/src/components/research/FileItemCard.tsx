"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FileItem } from "@/types/database";
import { getSignedDownloadUrl } from "@/lib/supabase/storage";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Download,
  Eye,
  MoreVertical,
  Edit3,
  FolderInput,
  Trash2,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface FileItemCardProps {
  file: FileItem;
  onRename: (file: FileItem) => void;
  onMove: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  onIndexSuccess?: () => void;
}

export const FileItemCard: React.FC<FileItemCardProps> = ({
  file,
  onRename,
  onMove,
  onDelete,
  onIndexSuccess,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [indexingStatus, setIndexingStatus] = useState<string | null>(file.indexing_status || (file.vector_indexed ? "completed" : "pending"));
  const [indexingError, setIndexingError] = useState<string | null>(file.indexing_error || null);

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isProcessable = ["pdf", "docx", "doc", "txt", "csv"].includes(ext);

  const getFileIcon = (name: string, mime?: string | null) => {
    if (ext === "pdf" || mime?.includes("pdf")) {
      return { icon: FileText, color: "text-[#0000CD] bg-blue-50" };
    }
    if (["csv", "xls", "xlsx"].includes(ext) || mime?.includes("excel") || mime?.includes("csv")) {
      return { icon: FileSpreadsheet, color: "text-emerald-600 bg-emerald-50" };
    }
    if (["png", "jpg", "jpeg", "webp"].includes(ext) || mime?.includes("image")) {
      return { icon: ImageIcon, color: "text-purple-600 bg-purple-50" };
    }
    if (["txt", "doc", "docx", "md"].includes(ext)) {
      return { icon: FileCode, color: "text-amber-600 bg-amber-50" };
    }
    return { icon: FileText, color: "text-gray-600 bg-gray-100" };
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const handleDownloadOrPreview = async (isPreview: boolean) => {
    setLoadingAction(true);
    try {
      const res = await getSignedDownloadUrl(file.file_path, 60);
      if (res.signedUrl) {
        if (isPreview) {
          window.open(res.signedUrl, "_blank");
        } else {
          const a = document.createElement("a");
          a.href = res.signedUrl;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        alert(res.error || "Failed to generate signed download link.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to access storage file.";
      alert(msg);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleProcessForAi = async () => {
    setIsProcessing(true);
    setIndexingStatus("processing");
    setIndexingError(null);

    try {
      const res = await fetch("/api/documents/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: file.id }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process document for AI.");
      }

      setIndexingStatus("completed");
      if (onIndexSuccess) onIndexSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Document processing failed.";
      setIndexingStatus("failed");
      setIndexingError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const { icon: Icon, color } = getFileIcon(file.name, file.mime_type);
  const uppercaseExt = ext.toUpperCase() || "FILE";
  const isPreviewable = ["pdf", "png", "jpg", "jpeg", "webp"].includes(ext);

  return (
    <Card interactive hoverHighlight className="h-full flex flex-col justify-between p-5 relative border-[#E5E7EB] group">
      <div className="space-y-3">
        {/* Header Icon & Options */}
        <div className="flex items-start justify-between">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shadow-xs`}>
            <Icon className="w-5 h-5" />
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="File actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 top-8 z-30 w-44 bg-white border border-[#E5E7EB] rounded-xl shadow-lg py-1 text-xs space-y-0.5">
                  {isProcessable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        handleProcessForAi();
                      }}
                      disabled={isProcessing}
                      className="w-full px-3 py-2 text-left text-[#0000CD] hover:bg-blue-50 flex items-center gap-2 font-semibold"
                    >
                      <Cpu className="w-3.5 h-3.5 text-[#0000CD]" /> {indexingStatus === "completed" ? "Re-index for AI" : "Process for AI"}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onRename(file);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-gray-500" /> Rename
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onMove(file);
                    }}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FolderInput className="w-3.5 h-3.5 text-amber-500" /> Move to Folder
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMenuOpen(false);
                      onDelete(file);
                    }}
                    className="w-full px-3 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete File
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* File Metadata */}
        <div>
          <h4
            className="text-sm font-semibold font-heading text-[#111111] line-clamp-2 hover:text-[#0000CD] transition-colors cursor-pointer"
            onClick={() => handleDownloadOrPreview(isPreviewable)}
            title={file.name}
          >
            {file.name}
          </h4>
          <p className="text-xs text-gray-500 mt-1">
            {formatSize(file.size_bytes)} &bull; {formatDate(file.created_at)}
          </p>
        </div>

        {/* Badges & Indexing Status */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <Badge variant="outline" className="text-[10px]">
            {uppercaseExt}
          </Badge>

          {isProcessable && (
            <>
              {indexingStatus === "completed" && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Indexed
                </span>
              )}
              {indexingStatus === "processing" && (
                <span className="px-2 py-0.5 bg-blue-50 text-[#0000CD] border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin text-[#0000CD]" /> Processing...
                </span>
              )}
              {indexingStatus === "failed" && (
                <span
                  className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-200 rounded-md text-[10px] font-bold flex items-center gap-1"
                  title={indexingError || "Failed to process text."}
                >
                  <AlertCircle className="w-3 h-3 text-red-600" /> Indexing Failed
                </span>
              )}
              {(!indexingStatus || indexingStatus === "pending") && (
                <button
                  onClick={handleProcessForAi}
                  disabled={isProcessing}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-[#0000CD] border border-gray-200 rounded-md text-[10px] font-semibold transition-colors flex items-center gap-1"
                >
                  <Cpu className="w-3 h-3" /> Process for AI
                </button>
              )}
            </>
          )}
        </div>

        {indexingError && indexingStatus === "failed" && (
          <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded-lg leading-tight border border-red-100">
            {indexingError}
          </p>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 mt-4 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
        {isPreviewable ? (
          <Button
            variant="ghost"
            size="sm"
            icon={loadingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
            onClick={() => handleDownloadOrPreview(true)}
            disabled={loadingAction}
          >
            Preview
          </Button>
        ) : (
          <span className="text-[11px] text-gray-400">No Preview</span>
        )}

        <Button
          variant="secondary"
          size="sm"
          icon={loadingAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          onClick={() => handleDownloadOrPreview(false)}
          disabled={loadingAction}
        >
          Download
        </Button>
      </div>
    </Card>
  );
};
