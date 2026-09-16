"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { ResearchCard } from "@/components/research/ResearchCard";
import { ProjectModal } from "@/components/research/ProjectModal";
import { ConfirmDialog } from "@/components/research/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { ResearchProject, ProjectStatus } from "@/types/database";
import { Plus, FolderKanban, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function ResearchPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedProject, setSelectedProject] = useState<ResearchProject | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ResearchProject | null>(null);

  const { user } = useAuth();
  const supabase = createClient();

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("research_projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("updated_at", { ascending: false });

      if (fetchErr) {
        throw fetchErr;
      }

      setProjects(data || []);
    } catch (err: any) {
      console.error("Error fetching research projects:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        name: err?.name,
        error: err,
      });
      setError(err?.message || "Failed to load research projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleCreateProject = () => {
    setSelectedProject(null);
    setModalMode("create");
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project: ResearchProject) => {
    setSelectedProject(project);
    setModalMode("edit");
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (formData: {
    title: string;
    description: string;
    status: ProjectStatus;
  }) => {
    if (!user) return;

    if (modalMode === "create") {
      const { error: insertErr } = await supabase.from("research_projects").insert([
        {
          owner_id: user.id,
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
        },
      ]);
      if (insertErr) throw insertErr;
    } else if (selectedProject) {
      const { error: updateErr } = await supabase
        .from("research_projects")
        .update({
          title: formData.title,
          description: formData.description || null,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedProject.id)
        .eq("owner_id", user.id);

      if (updateErr) throw updateErr;
    }

    await fetchProjects();
  };

  const handleArchiveProject = async (project: ResearchProject) => {
    if (!user) return;
    const newStatus: ProjectStatus = project.status === "archived" ? "active" : "archived";
    try {
      const { error: archiveErr } = await supabase
        .from("research_projects")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id)
        .eq("owner_id", user.id);

      if (archiveErr) throw archiveErr;
      await fetchProjects();
    } catch (err: any) {
      setError(err?.message || "Failed to archive project.");
    }
  };

  const handleDeleteTrigger = (project: ResearchProject) => {
    setProjectToDelete(project);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !projectToDelete) return;
    try {
      const { error: deleteErr } = await supabase
        .from("research_projects")
        .delete()
        .eq("id", projectToDelete.id)
        .eq("owner_id", user.id);

      if (deleteErr) throw deleteErr;
      await fetchProjects();
    } catch (err: any) {
      setError(err?.message || "Failed to delete research project.");
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Research Projects & Workspace"
          description="Manage your active research projects, structure nested literature folders, and organize research assets."
          badge={<Badge variant="primary">{projects.length} Total Projects</Badge>}
          actions={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleCreateProject}
            >
              New Research Project
            </Button>
          }
        />

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <SearchInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search research title or description..."
            />
          </div>

          <div className="flex items-center gap-1 bg-white border border-[#E5E7EB] p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {[
              { id: "all", label: "All Projects" },
              { id: "active", label: "Active" },
              { id: "completed", label: "Completed" },
              { id: "archived", label: "Archived" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-[#0000CD] text-white"
                    : "text-gray-600 hover:text-[#111111] hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Feedback Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchProjects}>
              Retry
            </Button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#0000CD] animate-spin" />
            <p className="text-xs font-medium text-gray-500">Loading research workspace projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16 px-6 bg-white border border-[#E5E7EB] rounded-2xl text-center max-w-lg mx-auto space-y-4 shadow-xs"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0000CD] flex items-center justify-center mx-auto">
              <FolderKanban className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-heading text-[#111111]">
                {search ? "No matching research projects" : "No research projects yet"}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                {search
                  ? "Try adjusting your search terms or status filters."
                  : "Create your first research project to organize files, citations, and research activities."}
              </p>
            </div>
            {!search && (
              <Button
                variant="primary"
                icon={<Plus className="w-4 h-4" />}
                onClick={handleCreateProject}
              >
                Create Research Project
              </Button>
            )}
          </motion.div>
        ) : (
          /* Projects Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ResearchCard
                  project={project}
                  onEdit={handleEditProject}
                  onArchive={handleArchiveProject}
                  onDelete={handleDeleteTrigger}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={handleSaveProject}
        initialData={selectedProject}
        mode={modalMode}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Research Project?"
        description={
          projectToDelete
            ? `Are you sure you want to delete "${projectToDelete.title}"? All associated folders and metadata will be permanently removed.`
            : "Are you sure you want to delete this project?"
        }
        confirmText="Delete Project"
        isDangerous
      />
    </AppLayout>
  );
}
