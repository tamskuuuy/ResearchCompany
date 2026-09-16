"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AddTaskModal } from "@/components/schedule/AddTaskModal";
import { AddMilestoneModal } from "@/components/schedule/AddMilestoneModal";
import { TimelineCalendar } from "@/components/schedule/TimelineCalendar";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  ResearchTask,
  ResearchMilestone,
  ResearchProject,
  TaskPriority,
  TaskStatus,
} from "@/types/database";
import {
  CalendarDays,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FolderKanban,
  Flag,
  CheckSquare,
  Filter,
  Loader2,
  Bell,
  AlertOctagon,
} from "lucide-react";
import { motion } from "framer-motion";

export default function SchedulePage() {
  const { user } = useAuth();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"timeline" | "tasks" | "milestones">("timeline");
  const [tasks, setTasks] = useState<ResearchTask[]>([]);
  const [milestones, setMilestones] = useState<ResearchMilestone[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  // Quick Create props for AddTaskModal
  const [quickCreateProps, setQuickCreateProps] = useState<{
    projectId?: string;
    startAt?: string;
    dueAt?: string;
  }>({});

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, milestonesRes, projRes] = await Promise.all([
        fetch(
          `/api/schedule/tasks?${new URLSearchParams({
            ...(selectedProjectId && { projectId: selectedProjectId }),
            ...(selectedPriority && { priority: selectedPriority }),
            ...(selectedStatus && { status: selectedStatus }),
          })}`
        ),
        fetch(
          `/api/schedule/milestones?${new URLSearchParams({
            ...(selectedProjectId && { projectId: selectedProjectId }),
          })}`
        ),
        supabase.from("research_projects").select("*").order("updated_at", { ascending: false }),
      ]);

      const tasksData = await tasksRes.json();
      const milestonesData = await milestonesRes.json();

      if (tasksRes.ok) setTasks(tasksData.tasks || []);
      if (milestonesRes.ok) setMilestones(milestonesData.milestones || []);
      if (projRes.data) setProjects(projRes.data as ResearchProject[]);
    } catch (err) {
      console.error("Failed to load scheduling workspace:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedProjectId, selectedPriority, selectedStatus]);

  const handleUpdateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch("/api/schedule/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        );
      }
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  };

  const handleTaskUpdated = (updatedTask: ResearchTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
  };

  const handleTaskDeleted = async (taskId: string) => {
    try {
      const res = await fetch(`/api/schedule/tasks?id=${taskId}`, { method: "DELETE" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  const handleMilestoneUpdated = (updatedMilestone: ResearchMilestone) => {
    setMilestones((prev) => prev.map((m) => (m.id === updatedMilestone.id ? updatedMilestone : m)));
  };

  const handleQuickCreateTask = (projectId: string, startIso: string, dueIso: string) => {
    setQuickCreateProps({
      projectId,
      startAt: startIso,
      dueAt: dueIso,
    });
    setIsTaskModalOpen(true);
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="accent" className="bg-red-50 text-red-700 border-red-200">Urgent</Badge>;
      case "HIGH":
        return <Badge variant="accent">High Priority</Badge>;
      case "MEDIUM":
        return <Badge variant="primary">Medium</Badge>;
      case "LOW":
        return <Badge variant="neutral">Low</Badge>;
    }
  };

  const upcomingCount = tasks.filter((t) => t.status !== "COMPLETED").length;
  const urgentCount = tasks.filter((t) => t.priority === "URGENT" && t.status !== "COMPLETED").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <PageHeader
          title="Research Schedule & Timeline Gantt"
          description="Visual interactive research timeline, task deadlines, project milestones, and experiment scheduling."
          badge={
            urgentCount > 0 ? (
              <Badge variant="accent">
                <AlertOctagon className="w-3 h-3 inline mr-1" /> {urgentCount} Urgent Deadlines
              </Badge>
            ) : (
              <Badge variant="primary">{upcomingCount} Active Tasks</Badge>
            )
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<Flag className="w-4 h-4" />}
                onClick={() => setIsMilestoneModalOpen(true)}
              >
                Add Milestone
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setQuickCreateProps({});
                  setIsTaskModalOpen(true);
                }}
              >
                Add Research Task
              </Button>
            </div>
          }
        />

        {/* View Switcher & Filters Bar */}
        <Card className="p-4 border-[#E5E7EB] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab("timeline")}
              className={`py-2 px-4 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
                activeTab === "timeline"
                  ? "bg-white text-[#0000CD] shadow-xs"
                  : "text-gray-500 hover:text-[#111111]"
              }`}
            >
              <CalendarDays className="w-4 h-4 text-[#0000CD]" /> Interactive Timeline
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`py-2 px-4 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
                activeTab === "tasks"
                  ? "bg-white text-[#0000CD] shadow-xs"
                  : "text-gray-500 hover:text-[#111111]"
              }`}
            >
              <CheckSquare className="w-4 h-4" /> Tasks List ({tasks.length})
            </button>
            <button
              onClick={() => setActiveTab("milestones")}
              className={`py-2 px-4 text-xs font-bold rounded-lg flex items-center gap-2 transition-all ${
                activeTab === "milestones"
                  ? "bg-white text-[#0000CD] shadow-xs"
                  : "text-gray-500 hover:text-[#111111]"
              }`}
            >
              <Flag className="w-4 h-4 text-[#FF7F00]" /> Milestones ({milestones.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-gray-500">
              <Filter className="w-3.5 h-3.5" />
              <span className="font-semibold">Filters:</span>
            </div>

            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-xl p-2 font-medium text-[#111111] focus:outline-none"
            >
              <option value="">All Research Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>

            {activeTab !== "milestones" && (
              <>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-2 font-medium text-[#111111] focus:outline-none"
                >
                  <option value="">All Priorities</option>
                  <option value="URGENT">Urgent</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-[#E5E7EB] rounded-xl p-2 font-medium text-[#111111] focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </>
            )}
          </div>
        </Card>

        {/* Content Section */}
        {isLoading ? (
          <Card className="p-12 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#0000CD]" />
            <span>Loading schedule workspace...</span>
          </Card>
        ) : activeTab === "timeline" ? (
          /* Interactive Gantt Timeline View */
          <TimelineCalendar
            tasks={tasks}
            milestones={milestones}
            projects={projects}
            onTaskUpdated={handleTaskUpdated}
            onTaskDeleted={handleTaskDeleted}
            onMilestoneUpdated={handleMilestoneUpdated}
            onQuickCreateTask={handleQuickCreateTask}
          />
        ) : activeTab === "tasks" ? (
          /* Tasks List */
          tasks.length === 0 ? (
            <Card className="p-12 text-center space-y-3 bg-gray-50/50 border border-dashed border-gray-200">
              <CheckSquare className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-600">No research tasks found matching filters.</p>
              <Button variant="secondary" size="sm" onClick={() => setIsTaskModalOpen(true)}>
                Create First Task
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const isCompleted = task.status === "COMPLETED";
                const isBlocked = task.status === "BLOCKED";
                const dueFormatted = task.due_at
                  ? new Date(task.due_at).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : null;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card
                      className={`p-5 border-[#E5E7EB] transition-colors ${
                        isCompleted ? "bg-gray-50/60 opacity-80" : "hover:border-[#0000CD]/30"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            {getPriorityBadge(task.priority)}

                            {task.research_projects && (
                              <span className="text-xs font-semibold text-[#0000CD] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
                                <FolderKanban className="w-3 h-3" />
                                {task.research_projects.title}
                              </span>
                            )}

                            {dueFormatted && (
                              <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                Due: {dueFormatted}
                              </span>
                            )}
                          </div>

                          <h3
                            className={`text-base font-bold font-heading text-[#111111] ${
                              isCompleted ? "line-through text-gray-400" : ""
                            }`}
                          >
                            {task.title}
                          </h3>

                          {task.description && (
                            <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
                              {task.description}
                            </p>
                          )}
                        </div>

                        {/* Status Select Buttons */}
                        <div className="shrink-0 flex items-center gap-2">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              handleUpdateTaskStatus(task.id, e.target.value as TaskStatus)
                            }
                            className={`text-xs font-bold rounded-xl px-3 py-2 border focus:outline-none ${
                              isCompleted
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isBlocked
                                ? "bg-red-50 text-red-700 border-red-200"
                                : task.status === "IN_PROGRESS"
                                ? "bg-blue-50 text-[#0000CD] border-blue-200"
                                : "bg-white text-gray-700 border-[#E5E7EB]"
                            }`}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="BLOCKED">Blocked</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : (
          /* Milestones List */
          milestones.length === 0 ? (
            <Card className="p-12 text-center space-y-3 bg-gray-50/50 border border-dashed border-gray-200">
              <Flag className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs font-semibold text-gray-600">No project milestones scheduled yet.</p>
              <Button variant="secondary" size="sm" onClick={() => setIsMilestoneModalOpen(true)}>
                Schedule First Milestone
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {milestones.map((m) => {
                const targetFormatted = new Date(m.target_date).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card className="p-6 border-[#E5E7EB] hover:border-[#0000CD]/30 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <Badge variant="accent">
                              <Flag className="w-3 h-3 inline mr-1" /> Milestone
                            </Badge>
                            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              Target Date: {targetFormatted}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold font-heading text-[#111111]">
                            {m.title}
                          </h3>

                          {m.description && (
                            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
                              {m.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {/* Modal for creating Research Task */}
        <AddTaskModal
          isOpen={isTaskModalOpen}
          onClose={() => setIsTaskModalOpen(false)}
          projects={projects}
          milestones={milestones}
          onTaskCreated={fetchData}
          initialProjectId={quickCreateProps.projectId}
          initialStartAt={quickCreateProps.startAt}
          initialDueAt={quickCreateProps.dueAt}
        />

        {/* Modal for creating Research Milestone */}
        <AddMilestoneModal
          isOpen={isMilestoneModalOpen}
          onClose={() => setIsMilestoneModalOpen(false)}
          projects={projects}
          onMilestoneCreated={fetchData}
        />
      </div>
    </AppLayout>
  );
}
