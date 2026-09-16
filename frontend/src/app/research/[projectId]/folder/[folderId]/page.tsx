"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Breadcrumbs, BreadcrumbItem } from "@/components/research/Breadcrumbs";
import { FolderModal } from "@/components/research/FolderModal";
import { FileUploadModal } from "@/components/research/FileUploadModal";
import { FileItemCard } from "@/components/research/FileItemCard";
import { FileRenameModal } from "@/components/research/FileRenameModal";
import { MoveFileModal } from "@/components/research/MoveFileModal";
import { ConfirmDialog } from "@/components/research/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { buildStoragePath, uploadFileToStorage, deleteFileFromStorage } from "@/lib/supabase/storage";
import { ResearchProject, Folder, FileItem } from "@/types/database";
import {
  Folder as FolderIcon,
  Plus,
  Edit3,
  Trash2,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

export default function NestedFolderPage({
  params,
}: {
  params: Promise<{ projectId: string; folderId: string }>;
}) {
  const resolvedParams = use(params);
  const { projectId, folderId } = resolvedParams;

  const [project, setProject] = useState<ResearchProject | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [parentFolders, setParentFolders] = useState<Folder[]>([]);
  const [breadcrumbsPath, setBreadcrumbsPath] = useState<BreadcrumbItem[]>([]);
  const [subFolders, setSubFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "size">("newest");

  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename">("create");
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedFileForRename, setSelectedFileForRename] = useState<FileItem | null>(null);
  const [selectedFileForMove, setSelectedFileForMove] = useState<FileItem | null>(null);

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "folder" | "file"; data: any } | null>(
    null
  );

  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const buildBreadcrumbs = async (folder: Folder, projTitle: string): Promise<BreadcrumbItem[]> => {
    const chain: BreadcrumbItem[] = [
      {
        name: folder.name,
        href: `/research/${projectId}/folder/${folder.id}`,
      },
    ];

    let currParentId = folder.parent_folder_id;
    while (currParentId) {
      const { data: parent } = await supabase
        .from("folders")
        .select("*")
        .eq("id", currParentId)
        .single();

      if (parent) {
        chain.unshift({
          name: parent.name,
          href: `/research/${projectId}/folder/${parent.id}`,
        });
        currParentId = parent.parent_folder_id;
      } else {
        break;
      }
    }

    chain.unshift({
      name: projTitle,
      href: `/research/${projectId}`,
    });

    return chain;
  };

  const fetchFolderData = async () => {
    if (!user || !projectId || !folderId) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch project with RLS owner check
      const { data: projData, error: projErr } = await supabase
        .from("research_projects")
        .select("*")
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .single();

      if (projErr || !projData) {
        throw new Error("Project access denied or not found.");
      }
      setProject(projData);

      // 2. Fetch current folder details
      const { data: foldData, error: foldErr } = await supabase
        .from("folders")
        .select("*")
        .eq("id", folderId)
        .eq("project_id", projectId)
        .single();

      if (foldErr || !foldData) {
        throw new Error("Folder not found.");
      }
      setCurrentFolder(foldData);

      // 3. Build breadcrumbs path
      const path = await buildBreadcrumbs(foldData, projData.title);
      setBreadcrumbsPath(path);

      // 4. Fetch all root/peer folders for move target list
      const { data: allFoldersData } = await supabase
        .from("folders")
        .select("*")
        .eq("project_id", projectId);
      setParentFolders(allFoldersData || []);

      // 5. Fetch sub-folders where parent_folder_id = folderId
      const { data: subData, error: subErr } = await supabase
        .from("folders")
        .select("*")
        .eq("project_id", projectId)
        .eq("parent_folder_id", folderId)
        .order("name", { ascending: true });

      if (subErr) throw subErr;
      setSubFolders(subData || []);

      // 6. Fetch nested files where folder_id = folderId
      const { data: fileData, error: fileErr } = await supabase
        .from("files")
        .select("*")
        .eq("project_id", projectId)
        .eq("folder_id", folderId)
        .order("created_at", { ascending: false });

      if (fileErr) throw fileErr;
      setFiles(fileData || []);
    } catch (err: any) {
      console.error("Error loading nested folder:", err);
      setError(err?.message || "Could not load folder contents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolderData();
  }, [user, projectId, folderId]);

  // File Upload to current folder
  const handleUploadFile = async (file: File) => {
    if (!user || !projectId || !folderId) return;
    const fileId = crypto.randomUUID();
    const storagePath = buildStoragePath(user.id, projectId, folderId, fileId, file.name);

    const storageRes = await uploadFileToStorage(file, storagePath);
    if (storageRes.error) throw new Error(storageRes.error);

    const { error: dbErr } = await supabase.from("files").insert([
      {
        id: fileId,
        project_id: projectId,
        folder_id: folderId,
        user_id: user.id,
        name: file.name,
        file_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || null,
        tags: [],
        vector_indexed: false,
      },
    ]);

    if (dbErr) {
      await deleteFileFromStorage(storagePath);
      throw new Error(dbErr.message);
    }

    await fetchFolderData();
  };

  // File Operations
  const handleRenameFile = async (newName: string) => {
    if (!selectedFileForRename) return;
    const { error: updateErr } = await supabase
      .from("files")
      .update({
        name: newName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedFileForRename.id)
      .eq("project_id", projectId);

    if (updateErr) throw updateErr;
    await fetchFolderData();
  };

  const handleMoveFile = async (targetFolderId: string | null) => {
    if (!selectedFileForMove) return;
    const { error: moveErr } = await supabase
      .from("files")
      .update({
        folder_id: targetFolderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedFileForMove.id)
      .eq("project_id", projectId);

    if (moveErr) throw moveErr;
    await fetchFolderData();
  };

  // Sub-folder Operations
  const handleCreateSubFolder = () => {
    setSelectedFolder(null);
    setFolderModalMode("create");
    setIsFolderModalOpen(true);
  };

  const handleRenameSubFolder = (folder: Folder) => {
    setSelectedFolder(folder);
    setFolderModalMode("rename");
    setIsFolderModalOpen(true);
  };

  const handleSaveSubFolder = async (name: string) => {
    if (!user || !projectId || !folderId) return;

    if (folderModalMode === "create") {
      const { error: insertErr } = await supabase.from("folders").insert([
        {
          project_id: projectId,
          parent_folder_id: folderId,
          name,
        },
      ]);
      if (insertErr) throw insertErr;
    } else if (selectedFolder) {
      const { error: updateErr } = await supabase
        .from("folders")
        .update({
          name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedFolder.id)
        .eq("project_id", projectId);

      if (updateErr) throw updateErr;
    }

    await fetchFolderData();
  };

  const handleDeleteTrigger = (type: "folder" | "file", data: any) => {
    setDeleteTarget({ type, data });
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !deleteTarget) return;

    if (deleteTarget.type === "folder") {
      const { error: delErr } = await supabase
        .from("folders")
        .delete()
        .eq("id", deleteTarget.data.id)
        .eq("project_id", projectId);

      if (delErr) throw delErr;

      if (deleteTarget.data.id === folderId) {
        if (currentFolder?.parent_folder_id) {
          router.push(`/research/${projectId}/folder/${currentFolder.parent_folder_id}`);
        } else {
          router.push(`/research/${projectId}`);
        }
      } else {
        await fetchFolderData();
      }
    } else if (deleteTarget.type === "file") {
      const targetFile: FileItem = deleteTarget.data;
      await deleteFileFromStorage(targetFile.file_path);

      const { error: dbDelErr } = await supabase
        .from("files")
        .delete()
        .eq("id", targetFile.id)
        .eq("project_id", projectId);

      if (dbDelErr) throw dbDelErr;
      await fetchFolderData();
    }
  };

  const filteredAndSortedFiles = files
    .filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return (b.size_bytes || 0) - (a.size_bytes || 0);
      return 0;
    });

  if (loading) {
    return (
      <AppLayout>
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-8 h-8 text-[#0000CD] animate-spin" />
          <p className="text-xs font-medium text-gray-500">Loading folder contents...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !currentFolder || !project) {
    return (
      <AppLayout>
        <div className="py-16 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-heading text-[#111111]">Folder Not Found</h3>
            <p className="text-xs text-gray-500">{error || "Folder could not be retrieved."}</p>
          </div>
          <Link href={`/research/${projectId}`}>
            <Button variant="primary">Return to Project Workspace</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Dynamic Breadcrumbs */}
        <Breadcrumbs items={breadcrumbsPath} />

        {/* Folder Header */}
        <PageHeader
          title={currentFolder.name}
          description={`Sub-folder inside project: ${project.title}`}
          badge={<Badge variant="primary">Nested Folder</Badge>}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Edit3 className="w-4 h-4" />}
                onClick={() => handleRenameSubFolder(currentFolder)}
              >
                Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-4 h-4 text-red-600" />}
                onClick={() => handleDeleteTrigger("folder", currentFolder)}
                className="text-red-600 hover:bg-red-50"
              >
                Delete
              </Button>
            </div>
          }
        />

        {/* Sub-Folders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold font-heading text-[#111111] flex items-center gap-2">
              <FolderIcon className="w-4 h-4 text-[#0000CD]" /> Sub-Folders ({subFolders.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreateSubFolder}
            >
              New Sub-Folder
            </Button>
          </div>

          {subFolders.length === 0 ? (
            <div className="p-8 bg-white border border-dashed border-[#E5E7EB] rounded-2xl text-center text-xs text-gray-500 space-y-2">
              <p>No nested folders inside "{currentFolder.name}".</p>
              <Button variant="ghost" size="sm" onClick={handleCreateSubFolder}>
                + Create Sub-Folder
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {subFolders.map((sub) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card
                    interactive
                    hoverHighlight
                    className="p-4 border-[#E5E7EB] flex items-center justify-between group"
                  >
                    <Link
                      href={`/research/${projectId}/folder/${sub.id}`}
                      className="flex items-center gap-3 min-w-0 flex-1 group-hover:no-underline"
                    >
                      <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <FolderIcon className="w-5 h-5 fill-amber-500/20" />
                      </div>
                      <span className="text-sm font-semibold font-heading text-[#111111] truncate group-hover:text-[#0000CD] transition-colors">
                        {sub.name}
                      </span>
                    </Link>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRenameSubFolder(sub)}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="Rename folder"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTrigger("folder", sub)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete folder"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Real Files Area in Folder */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold font-heading text-[#111111] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#0000CD]" /> Folder Files ({filteredAndSortedFiles.length})
            </h2>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <div className="w-48 sm:w-60">
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                  placeholder="Search file name..."
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#0000CD]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="size">Largest Size</option>
              </select>

              <Button
                variant="primary"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                onClick={() => setIsUploadModalOpen(true)}
              >
                Upload File
              </Button>
            </div>
          </div>

          {filteredAndSortedFiles.length === 0 ? (
            <div className="p-10 bg-white border border-[#E5E7EB] rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#0000CD] flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-sm font-bold font-heading text-[#111111]">
                  {search ? "No matching files" : `No files in "${currentFolder.name}"`}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {search
                    ? "Try searching for a different file name."
                    : `Upload PDFs, empirical datasets, and lab logs into "${currentFolder.name}".`}
                </p>
              </div>
              {!search && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => setIsUploadModalOpen(true)}
                >
                  Upload File to Folder
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAndSortedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <FileItemCard
                    file={file}
                    onRename={(f) => setSelectedFileForRename(f)}
                    onMove={(f) => setSelectedFileForMove(f)}
                    onDelete={(f) => handleDeleteTrigger("file", f)}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload File Modal */}
      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUploadFile}
        targetFolderName={currentFolder.name}
      />

      {/* Rename File Modal */}
      <FileRenameModal
        isOpen={Boolean(selectedFileForRename)}
        onClose={() => setSelectedFileForRename(null)}
        onRename={handleRenameFile}
        currentName={selectedFileForRename?.name || ""}
      />

      {/* Move File Modal */}
      <MoveFileModal
        isOpen={Boolean(selectedFileForMove)}
        onClose={() => setSelectedFileForMove(null)}
        onMove={handleMoveFile}
        fileName={selectedFileForMove?.name || ""}
        currentFolderId={selectedFileForMove?.folder_id || null}
        folders={parentFolders}
      />

      {/* Sub-Folder Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSubmit={handleSaveSubFolder}
        initialData={selectedFolder}
        mode={folderModalMode}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        title={deleteTarget?.type === "folder" ? "Delete Folder?" : "Delete Research File?"}
        description={
          deleteTarget?.type === "folder"
            ? `Delete folder "${deleteTarget?.data?.name}" and any sub-folders?`
            : `Permanently delete "${deleteTarget?.data?.name}" from Supabase Storage and workspace database?`
        }
        confirmText="Confirm Delete"
        isDangerous
      />
    </AppLayout>
  );
}
