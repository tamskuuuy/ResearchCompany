"use client";

import React, { useState, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { validateFile } from "@/lib/supabase/storage";
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  targetFolderName?: string;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  targetFolderName,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setSelectedFile(null);
    setError(null);
    setStatus("idle");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    const val = validateFile(file);
    if (!val.valid) {
      setError(val.error || "Invalid file.");
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setStatus("uploading");
    setError(null);

    try {
      await onUpload(selectedFile);
      setStatus("success");
      setTimeout(() => {
        handleClose();
      }, 1200);
    } catch (err: any) {
      console.error("Upload error:", err);
      setStatus("idle");
      setError(err?.message || "Upload failed. Please try again.");
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Research File"
      description={
        targetFolderName
          ? `Upload document to folder "${targetFolderName}". Max file size is 50 MB.`
          : "Upload document to project root workspace. Max file size is 50 MB."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {status === "success" ? (
          <div className="p-8 text-center bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-sm font-bold font-heading text-emerald-900">Uploaded Successfully</h4>
            <p className="text-xs text-emerald-700">File metadata stored and ready in workspace.</p>
          </div>
        ) : (
          <>
            {/* Drag and Drop Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors ${
                isDragOver
                  ? "border-[#0000CD] bg-blue-50/50"
                  : selectedFile
                  ? "border-emerald-500 bg-emerald-50/20"
                  : "border-[#E5E7EB] hover:border-[#0000CD]/50 bg-gray-50/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {selectedFile ? (
                <div className="flex items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0000CD] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold font-heading text-[#111111] truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {formatSize(selectedFile.size)} &bull; {selectedFile.type || "Document"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0000CD] flex items-center justify-center mx-auto">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold font-heading text-[#111111]">
                      Click to choose or drag & drop file here
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Supported: PDF, DOCX, XLSX, PPTX, CSV, TXT, PNG, JPG (Up to 50 MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <Button
                variant="secondary"
                type="button"
                onClick={handleClose}
                disabled={status === "uploading"}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                icon={status === "uploading" ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                disabled={!selectedFile || status === "uploading"}
              >
                {status === "uploading" ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
