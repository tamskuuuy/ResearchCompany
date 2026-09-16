"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ResearchTask, ResearchMilestone, ResearchProject, TaskPriority, TaskStatus } from "@/types/database";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Flag,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit2,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type TimeScale = "DAY" | "WEEK" | "MONTH";

interface TimelineCalendarProps {
  tasks: ResearchTask[];
  milestones: ResearchMilestone[];
  projects: ResearchProject[];
  onTaskUpdated: (updatedTask: ResearchTask) => void;
  onTaskDeleted?: (taskId: string) => void;
  onMilestoneUpdated: (updatedMilestone: ResearchMilestone) => void;
  onQuickCreateTask: (projectId: string, startIso: string, dueIso: string) => void;
}

export const TimelineCalendar: React.FC<TimelineCalendarProps> = ({
  tasks,
  milestones,
  projects,
  onTaskUpdated,
  onTaskDeleted,
  onMilestoneUpdated,
  onQuickCreateTask,
}) => {
  const [scale, setScale] = useState<TimeScale>("MONTH");
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [selectedTask, setSelectedTask] = useState<ResearchTask | null>(null);
  
  // Dragging / Resizing interaction state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragType, setDragType] = useState<"MOVE_TASK" | "RESIZE_LEFT" | "RESIZE_RIGHT" | "MOVE_MILESTONE" | null>(null);
  const [dragStartX, setDragStartX] = useState<number>(0);
  const [dragOriginalStartMs, setDragOriginalStartMs] = useState<number>(0);
  const [dragOriginalDueMs, setDragOriginalDueMs] = useState<number>(0);

  // Quick drag-to-create selection state
  const [isQuickSelecting, setIsQuickSelecting] = useState(false);
  const [quickSelectProjectId, setQuickSelectProjectId] = useState<string | null>(null);
  const [quickSelectStartX, setQuickSelectStartX] = useState<number>(0);
  const [quickSelectRange, setQuickSelectRange] = useState<{ startMs: number; endMs: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const timelineGridRef = useRef<HTMLDivElement>(null);

  // Determine Timeline Date Window (30 days before & 60 days after anchor date)
  const { startDate, endDate, daysCount, columnWidth } = useMemo(() => {
    const start = new Date(anchorDate);
    start.setHours(0, 0, 0, 0);

    let days = 60;
    let colWidth = 44;

    if (scale === "DAY") {
      start.setDate(start.getDate() - 7);
      days = 30;
      colWidth = 72;
    } else if (scale === "WEEK") {
      start.setDate(start.getDate() - 14);
      days = 60;
      colWidth = 52;
    } else {
      // MONTH
      start.setDate(start.getDate() - 30);
      days = 90;
      colWidth = 40;
    }

    const end = new Date(start);
    end.setDate(end.getDate() + days);

    return {
      startDate: start,
      endDate: end,
      daysCount: days,
      columnWidth: colWidth,
    };
  }, [anchorDate, scale]);

  // Generate array of day columns
  const timelineDays = useMemo(() => {
    const daysArr: Date[] = [];
    const curr = new Date(startDate);
    while (curr < endDate) {
      daysArr.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return daysArr;
  }, [startDate, endDate]);

  const totalTimelineWidth = daysCount * columnWidth;

  // Calculate pixel position for a given Date or timestamp
  const getXForDate = (dateStrOrObjOrMs: number | string | Date | null | undefined): number => {
    if (!dateStrOrObjOrMs) return 0;
    const date = typeof dateStrOrObjOrMs === "number" ? new Date(dateStrOrObjOrMs) : new Date(dateStrOrObjOrMs);
    const diffMs = date.getTime() - startDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(totalTimelineWidth, diffDays * columnWidth));
  };

  // Convert pixel offset to Date
  const getDateForX = (xPixels: number): Date => {
    const days = xPixels / columnWidth;
    const date = new Date(startDate);
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    return date;
  };

  // Group items by project (including Unassigned / Personal)
  const groupedProjects = useMemo(() => {
    const map: { [projId: string]: { project: ResearchProject | null; tasks: ResearchTask[]; milestones: ResearchMilestone[] } } = {};

    // Initialize map with user's projects
    projects.forEach((p) => {
      map[p.id] = { project: p, tasks: [], milestones: [] };
    });

    // Default group for personal/unassigned tasks
    map["unassigned"] = {
      project: null,
      tasks: [],
      milestones: [],
    };

    tasks.forEach((t) => {
      const pId = t.project_id || "unassigned";
      if (!map[pId]) {
        map[pId] = { project: null, tasks: [], milestones: [] };
      }
      map[pId].tasks.push(t);
    });

    milestones.forEach((m) => {
      const pId = m.project_id || "unassigned";
      if (!map[pId]) {
        map[pId] = { project: null, tasks: [], milestones: [] };
      }
      map[pId].milestones.push(m);
    });

    // Remove empty unassigned group if no items
    if (map["unassigned"].tasks.length === 0 && map["unassigned"].milestones.length === 0) {
      delete map["unassigned"];
    }

    return map;
  }, [projects, tasks, milestones]);

  // Today Indicator Calculation
  const todayX = getXForDate(new Date());

  // Navigation handlers
  const handleJumpToToday = () => {
    setAnchorDate(new Date());
    if (containerRef.current) {
      const todayPx = getXForDate(new Date());
      containerRef.current.scrollTo({ left: Math.max(0, todayPx - 250), behavior: "smooth" });
    }
  };

  const handlePrevTime = () => {
    const nextAnchor = new Date(anchorDate);
    nextAnchor.setDate(nextAnchor.getDate() - (scale === "DAY" ? 7 : scale === "WEEK" ? 14 : 30));
    setAnchorDate(nextAnchor);
  };

  const handleNextTime = () => {
    const nextAnchor = new Date(anchorDate);
    nextAnchor.setDate(nextAnchor.getDate() + (scale === "DAY" ? 7 : scale === "WEEK" ? 14 : 30));
    setAnchorDate(nextAnchor);
  };

  // Toggle project group collapse
  const toggleProject = (pId: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [pId]: !prev[pId] }));
  };

  // Mouse drag & drop handlers for Tasks
  const handleTaskMouseDown = (
    e: React.MouseEvent,
    task: ResearchTask,
    type: "MOVE_TASK" | "RESIZE_LEFT" | "RESIZE_RIGHT"
  ) => {
    e.stopPropagation();
    e.preventDefault();

    const startMs = task.start_at ? new Date(task.start_at).getTime() : new Date(task.created_at).getTime();
    const dueMs = task.due_at ? new Date(task.due_at).getTime() : startMs + 3 * 24 * 60 * 60 * 1000;

    setDraggingItemId(task.id);
    setDragType(type);
    setDragStartX(e.clientX);
    setDragOriginalStartMs(startMs);
    setDragOriginalDueMs(dueMs);
  };

  // Mouse drag for Milestones
  const handleMilestoneMouseDown = (e: React.MouseEvent, milestone: ResearchMilestone) => {
    e.stopPropagation();
    e.preventDefault();

    setDraggingItemId(milestone.id);
    setDragType("MOVE_MILESTONE");
    setDragStartX(e.clientX);
    setDragOriginalStartMs(new Date(milestone.target_date).getTime());
  };

  // Quick Create drag selection
  const handleRowMouseDown = (e: React.MouseEvent, projectId: string) => {
    if (draggingItemId) return;
    const rect = timelineGridRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
    setIsQuickSelecting(true);
    setQuickSelectProjectId(projectId);
    setQuickSelectStartX(clickX);
    const date = getDateForX(clickX);
    setQuickSelectRange({ startMs: date.getTime(), endMs: date.getTime() + 24 * 60 * 60 * 1000 });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingItemId && dragType) {
        const deltaX = e.clientX - dragStartX;
        const deltaDays = deltaX / columnWidth;
        const deltaMs = deltaDays * 24 * 60 * 60 * 1000;

        if (dragType === "MOVE_TASK") {
          const newStartMs = dragOriginalStartMs + deltaMs;
          const newDueMs = dragOriginalDueMs + deltaMs;

          // Optimistic local feedback
          const targetTask = tasks.find((t) => t.id === draggingItemId);
          if (targetTask) {
            targetTask._tempStart = new Date(newStartMs).toISOString();
            targetTask._tempDue = new Date(newDueMs).toISOString();
          }
        } else if (dragType === "RESIZE_LEFT") {
          const newStartMs = Math.min(dragOriginalStartMs + deltaMs, dragOriginalDueMs - 24 * 60 * 60 * 1000);
          const targetTask = tasks.find((t) => t.id === draggingItemId);
          if (targetTask) {
            targetTask._tempStart = new Date(newStartMs).toISOString();
          }
        } else if (dragType === "RESIZE_RIGHT") {
          const newDueMs = Math.max(dragOriginalDueMs + deltaMs, dragOriginalStartMs + 24 * 60 * 60 * 1000);
          const targetTask = tasks.find((t) => t.id === draggingItemId);
          if (targetTask) {
            targetTask._tempDue = new Date(newDueMs).toISOString();
          }
        } else if (dragType === "MOVE_MILESTONE") {
          const newTargetMs = dragOriginalStartMs + deltaMs;
          const targetMs = milestones.find((m) => m.id === draggingItemId);
          if (targetMs) {
            targetMs._tempTarget = new Date(newTargetMs).toISOString();
          }
        }
      } else if (isQuickSelecting && quickSelectRange && timelineGridRef.current) {
        const rect = timelineGridRef.current.getBoundingClientRect();
        const currX = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0);
        const currDate = getDateForX(currX);
        const startDateObj = getDateForX(quickSelectStartX);

        if (currDate < startDateObj) {
          setQuickSelectRange({ startMs: currDate.getTime(), endMs: startDateObj.getTime() });
        } else {
          setQuickSelectRange({ startMs: startDateObj.getTime(), endMs: currDate.getTime() });
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (draggingItemId && dragType) {
        const deltaX = e.clientX - dragStartX;
        const deltaDays = deltaX / columnWidth;
        const deltaMs = deltaDays * 24 * 60 * 60 * 1000;

        if (dragType.startsWith("RESIZE") || dragType === "MOVE_TASK") {
          const targetTask = tasks.find((t) => t.id === draggingItemId);
          if (targetTask) {
            const finalStartIso = targetTask._tempStart || targetTask.start_at || new Date(dragOriginalStartMs + deltaMs).toISOString();
            const finalDueIso = targetTask._tempDue || targetTask.due_at || new Date(dragOriginalDueMs + deltaMs).toISOString();

            delete targetTask._tempStart;
            delete targetTask._tempDue;

            // Trigger backend update via PATCH
            try {
              const res = await fetch("/api/schedule/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: targetTask.id,
                  startAt: finalStartIso,
                  dueAt: finalDueIso,
                }),
              });

              const data = await res.json();
              if (res.ok && data.task) {
                onTaskUpdated(data.task);
              }
            } catch (err) {
              console.error("Failed to persist task drag position:", err);
            }
          }
        } else if (dragType === "MOVE_MILESTONE") {
          const targetMs = milestones.find((m) => m.id === draggingItemId);
          if (targetMs) {
            const finalTargetIso = targetMs._tempTarget || new Date(dragOriginalStartMs + deltaMs).toISOString();
            delete targetMs._tempTarget;

            try {
              const res = await fetch("/api/schedule/milestones", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: targetMs.id,
                  targetDate: finalTargetIso,
                }),
              });

              const data = await res.json();
              if (res.ok && data.milestone) {
                onMilestoneUpdated(data.milestone);
              }
            } catch (err) {
              console.error("Failed to persist milestone drag position:", err);
            }
          }
        }

        setDraggingItemId(null);
        setDragType(null);
      } else if (isQuickSelecting && quickSelectRange) {
        setIsQuickSelecting(false);
        const pId = quickSelectProjectId || "";
        const startIso = new Date(quickSelectRange.startMs).toISOString().slice(0, 16);
        const dueIso = new Date(quickSelectRange.endMs).toISOString().slice(0, 16);

        onQuickCreateTask(pId, startIso, dueIso);
        setQuickSelectRange(null);
        setQuickSelectProjectId(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [draggingItemId, dragType, dragStartX, dragOriginalStartMs, dragOriginalDueMs, columnWidth, isQuickSelecting, quickSelectRange, quickSelectStartX, quickSelectProjectId]);

  // Color helper based on priority & status
  const getTaskColorClass = (task: ResearchTask) => {
    if (task.status === "COMPLETED") return "bg-emerald-500/80 text-white border-emerald-600";
    if (task.status === "BLOCKED") return "bg-red-500/80 text-white border-red-600";
    if (task.priority === "URGENT") return "bg-red-600 text-white border-red-700 shadow-xs";
    if (task.priority === "HIGH") return "bg-[#FF7F00] text-white border-orange-600";
    if (task.priority === "MEDIUM") return "bg-[#0000CD] text-white border-blue-700";
    return "bg-slate-600 text-white border-slate-700";
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Timeline Controls & Header */}
      <div className="p-4 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleJumpToToday}>
            Today
          </Button>
          <div className="flex items-center bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
            <button
              onClick={handlePrevTime}
              className="p-2 hover:bg-gray-100 text-gray-600 border-r border-[#E5E7EB]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-xs font-bold text-[#111111] font-heading min-w-[140px] text-center">
              {startDate.toLocaleDateString([], { month: "short", day: "numeric" })} -{" "}
              {endDate.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button
              onClick={handleNextTime}
              className="p-2 hover:bg-gray-100 text-gray-600 border-l border-[#E5E7EB]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scale Zoom Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Timeline Scale:</span>
          <div className="flex bg-gray-200/70 p-1 rounded-xl gap-1">
            {(["DAY", "WEEK", "MONTH"] as TimeScale[]).map((s) => (
              <button
                key={s}
                onClick={() => setScale(s)}
                className={`py-1 px-3 text-xs font-bold rounded-lg transition-all ${
                  scale === s ? "bg-white text-[#0000CD] shadow-2xs" : "text-gray-600 hover:text-[#111111]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Gantt Timeline View */}
      <div className="flex-1 overflow-x-auto relative flex" ref={containerRef}>
        {/* Left Sticky Task / Project Sidebar Column */}
        <div className="sticky left-0 z-30 w-64 md:w-80 shrink-0 bg-white border-r border-[#E5E7EB] shadow-xs">
          <div className="h-12 border-b border-[#E5E7EB] bg-gray-50/80 px-4 flex items-center font-bold text-xs text-gray-700 font-heading">
            Research Projects & Tasks
          </div>

          <div className="divide-y divide-gray-100">
            {Object.entries(groupedProjects).map(([pId, group]) => {
              const isCollapsed = !!collapsedProjects[pId];
              const projectTitle = group.project ? group.project.title : "Personal / Independent";

              return (
                <div key={pId} className="bg-white">
                  {/* Group Header Row */}
                  <div
                    onClick={() => toggleProject(pId)}
                    className="h-10 px-4 bg-gray-50/70 hover:bg-gray-100/70 cursor-pointer flex items-center justify-between border-y border-gray-100"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-[#111111] truncate">
                        {projectTitle}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-400 px-2 py-0.5 bg-white rounded-full border border-gray-200">
                      {group.tasks.length + group.milestones.length} items
                    </span>
                  </div>

                  {/* Tasks Rows (if expanded) */}
                  {!isCollapsed && (
                    <div className="divide-y divide-gray-50">
                      {/* Milestones Row Header */}
                      {group.milestones.map((m) => (
                        <div
                          key={m.id}
                          className="h-9 px-6 flex items-center justify-between hover:bg-orange-50/40 transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Flag className="w-3 h-3 text-[#FF7F00] shrink-0" />
                            <span className="text-xs font-medium text-gray-700 truncate">{m.title}</span>
                          </div>
                        </div>
                      ))}

                      {/* Tasks Rows */}
                      {group.tasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTask(t)}
                          className="h-11 px-6 flex items-center justify-between hover:bg-blue-50/40 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                t.status === "COMPLETED"
                                  ? "bg-emerald-500"
                                  : t.status === "BLOCKED"
                                  ? "bg-red-500"
                                  : t.priority === "URGENT"
                                  ? "bg-red-600 animate-pulse"
                                  : "bg-[#0000CD]"
                              }`}
                            />
                            <span className="text-xs font-semibold text-[#111111] truncate">{t.title}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Scrollable Timeline Grid */}
        <div
          ref={timelineGridRef}
          className="relative flex-1 min-h-[500px]"
          style={{ width: totalTimelineWidth }}
        >
          {/* Timeline Date Columns Header */}
          <div className="h-12 border-b border-[#E5E7EB] bg-gray-50/80 flex sticky top-0 z-20">
            {timelineDays.map((day, idx) => {
              const isToday = day.toDateString() === new Date().toDateString();
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;

              return (
                <div
                  key={idx}
                  style={{ width: columnWidth }}
                  className={`shrink-0 border-r border-[#E5E7EB]/60 text-center py-1.5 flex flex-col justify-center text-[10px] ${
                    isToday
                      ? "bg-blue-100/60 font-bold text-[#0000CD]"
                      : isWeekend
                      ? "bg-gray-100/40 text-gray-400"
                      : "text-gray-600"
                  }`}
                >
                  <span className="uppercase font-semibold">{day.toLocaleDateString([], { weekday: "narrow" })}</span>
                  <span className="font-bold text-xs">{day.getDate()}</span>
                </div>
              );
            })}
          </div>

          {/* Today Line Indicator */}
          {todayX >= 0 && todayX <= totalTimelineWidth && (
            <div
              style={{ left: todayX }}
              className="absolute top-0 bottom-0 z-10 w-0.5 bg-[#FF7F00] pointer-events-none"
            >
              <div className="absolute -top-3 -left-3 bg-[#FF7F00] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                TODAY
              </div>
            </div>
          )}

          {/* Timeline Grid Rows matching Left Sidebar */}
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedProjects).map(([pId, group]) => {
              const isCollapsed = !!collapsedProjects[pId];

              return (
                <div key={pId}>
                  {/* Group Background Drag-to-Create Bar */}
                  <div
                    onMouseDown={(e) => handleRowMouseDown(e, pId)}
                    className="h-10 bg-gray-50/30 border-y border-gray-100 relative cursor-crosshair group"
                  >
                    <div className="opacity-0 group-hover:opacity-100 text-[10px] text-gray-400 px-3 py-2 pointer-events-none">
                      Drag across dates to quick-create task...
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div>
                      {/* Milestones Timeline Row */}
                      {group.milestones.map((m) => {
                        const targetMs = m._tempTarget ? new Date(m._tempTarget).getTime() : new Date(m.target_date).getTime();
                        const mX = getXForDate(targetMs);

                        return (
                          <div key={m.id} className="h-9 relative border-b border-gray-50/60">
                            <div
                              onMouseDown={(e) => handleMilestoneMouseDown(e, m)}
                              style={{ left: mX - 12 }}
                              className="absolute top-1.5 z-20 cursor-grab active:cursor-grabbing group"
                            >
                              <div className="flex items-center gap-1 bg-white border border-[#FF7F00] px-2 py-0.5 rounded-full shadow-xs text-[10px] font-bold text-[#FF7F00] group-hover:scale-105 transition-transform">
                                <Flag className="w-3 h-3 fill-[#FF7F00]" />
                                <span className="truncate max-w-[120px]">{m.title}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Tasks Bars Timeline Rows */}
                      {group.tasks.map((t) => {
                        const startMs = t._tempStart
                          ? new Date(t._tempStart).getTime()
                          : t.start_at
                          ? new Date(t.start_at).getTime()
                          : new Date(t.created_at).getTime();
                        const dueMs = t._tempDue
                          ? new Date(t._tempDue).getTime()
                          : t.due_at
                          ? new Date(t.due_at).getTime()
                          : startMs + 3 * 24 * 60 * 60 * 1000;

                        const startX = getXForDate(startMs);
                        const dueX = getXForDate(dueMs);
                        const widthPx = Math.max(columnWidth, dueX - startX);

                        const isOverdue = t.due_at && new Date(t.due_at) < new Date() && t.status !== "COMPLETED";

                        return (
                          <div key={t.id} className="h-11 relative border-b border-gray-50/60">
                            <div
                              style={{ left: startX, width: widthPx }}
                              className={`absolute top-1.5 h-8 rounded-xl border flex items-center px-2 z-10 cursor-grab active:cursor-grabbing group shadow-2xs transition-all ${getTaskColorClass(
                                t
                              )}`}
                              onMouseDown={(e) => handleTaskMouseDown(e, t, "MOVE_TASK")}
                            >
                              {/* Left Resize Handle */}
                              <div
                                onMouseDown={(e) => handleTaskMouseDown(e, t, "RESIZE_LEFT")}
                                className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/30 rounded-l-xl"
                              />

                              <div className="flex items-center gap-1.5 truncate text-[11px] font-bold px-1 select-none">
                                {isOverdue && <AlertOctagon className="w-3.5 h-3.5 text-yellow-300 shrink-0" />}
                                <span className="truncate">{t.title}</span>
                              </div>

                              {/* Right Resize Handle */}
                              <div
                                onMouseDown={(e) => handleTaskMouseDown(e, t, "RESIZE_RIGHT")}
                                className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/30 rounded-r-xl"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Select Preview Overlay */}
          {isQuickSelecting && quickSelectRange && (
            <div
              style={{
                left: getXForDate(quickSelectRange.startMs),
                width: Math.max(columnWidth, getXForDate(quickSelectRange.endMs) - getXForDate(quickSelectRange.startMs)),
              }}
              className="absolute top-0 bottom-0 bg-[#0000CD]/15 border-2 border-dashed border-[#0000CD] pointer-events-none z-20"
            />
          )}
        </div>
      </div>

      {/* Task Details Drawer Modal */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <Badge variant="primary">{selectedTask.priority} PRIORITY</Badge>
                    <Badge variant={selectedTask.status === "COMPLETED" ? "accent" : "neutral"}>
                      {selectedTask.status}
                    </Badge>
                  </div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold font-heading text-[#111111]">{selectedTask.title}</h2>
                  {selectedTask.research_projects && (
                    <p className="text-xs font-semibold text-[#0000CD] flex items-center gap-1">
                      <FolderKanban className="w-3.5 h-3.5" />
                      {selectedTask.research_projects.title}
                    </p>
                  )}
                </div>

                {selectedTask.description && (
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold font-heading text-gray-500 uppercase">Instructions & Notes</h4>
                    <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
                      {selectedTask.description}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-semibold">Start Date</span>
                    <span className="font-bold text-[#111111]">
                      {selectedTask.start_at
                        ? new Date(selectedTask.start_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                        : "Not specified"}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-gray-400 block font-semibold">Due Date</span>
                    <span className="font-bold text-[#111111]">
                      {selectedTask.due_at
                        ? new Date(selectedTask.due_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
                        : "Not specified"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-[#E5E7EB] flex items-center justify-between gap-3">
                {onTaskDeleted && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this research task?")) {
                        onTaskDeleted(selectedTask.id);
                        setSelectedTask(null);
                      }
                    }}
                  >
                    Delete Task
                  </Button>
                )}

                <Button variant="primary" size="sm" onClick={() => setSelectedTask(null)}>
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
