import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/schedule/tasks — List research tasks with project & assignment filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");

    let query = supabase
      .from("research_tasks")
      .select(`
        *,
        research_projects (
          id,
          title,
          status
        ),
        research_milestones (
          id,
          title,
          target_date
        )
      `)
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      .order("due_at", { ascending: true, nullsFirst: false });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data: tasks, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch research tasks: ${error.message}`);
    }

    return NextResponse.json({ tasks: tasks || [] });
  } catch (error: any) {
    console.error("GET /api/schedule/tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch tasks." },
      { status: 500 }
    );
  }
}

// POST /api/schedule/tasks — Create a new research task
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      projectId,
      milestoneId,
      assignedTo,
      status = "TODO",
      priority = "MEDIUM",
      startAt,
      dueAt,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Task title is required." }, { status: 400 });
    }

    // 1. Verify project ownership if project_id is supplied
    if (projectId) {
      const { data: proj } = await supabase
        .from("research_projects")
        .select("id")
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!proj) {
        return NextResponse.json({ error: "Project not found or access denied." }, { status: 403 });
      }
    }

    // 2. Insert research task
    const { data: newTask, error: insertErr } = await supabase
      .from("research_tasks")
      .insert([
        {
          title: title.trim(),
          description: description ? description.trim() : null,
          project_id: projectId || null,
          milestone_id: milestoneId || null,
          created_by: user.id,
          assigned_to: assignedTo || user.id,
          status,
          priority,
          start_at: startAt || null,
          due_at: dueAt || null,
        },
      ])
      .select("*")
      .single();

    if (insertErr || !newTask) {
      throw new Error(insertErr?.message || "Failed to create task.");
    }

    // 3. Create notification for assignee if assigned to another researcher
    if (assignedTo && assignedTo !== user.id) {
      await supabase.from("user_notifications").insert([
        {
          user_id: assignedTo,
          type: "task_assigned",
          title: "New Research Task Assigned",
          message: `You were assigned task "${title.trim()}"`,
          task_id: newTask.id,
        },
      ]);
    }

    return NextResponse.json({ task: newTask });
  } catch (error: any) {
    console.error("POST /api/schedule/tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create task." },
      { status: 500 }
    );
  }
}

// PUT /api/schedule/tasks — Update task status, priority, or details
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, priority, title, description, dueAt } = body;

    if (!id) {
      return NextResponse.json({ error: "Task id is required." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (status) {
      updatePayload.status = status;
      if (status === "COMPLETED") {
        updatePayload.completed_at = new Date().toISOString();
      }
    }
    if (priority) updatePayload.priority = priority;
    if (title) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description;
    if (dueAt !== undefined) updatePayload.due_at = dueAt;

    const { data: updatedTask, error: updateErr } = await supabase
      .from("research_tasks")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr) {
      throw new Error(`Failed to update task: ${updateErr.message}`);
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("PUT /api/schedule/tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update task." },
      { status: 500 }
    );
  }
}

// PATCH /api/schedule/tasks — Update start_at, due_at, status, or details (used by drag & drop / resize)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { id, startAt, dueAt, status, priority, title, description, assignedTo } = body;

    if (!id) {
      return NextResponse.json({ error: "Task id is required." }, { status: 400 });
    }

    // Verify task authorization (must be created by user or assigned to user)
    const { data: existingTask } = await supabase
      .from("research_tasks")
      .select("*")
      .eq("id", id)
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      .maybeSingle();

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found or permission denied." }, { status: 403 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (startAt !== undefined) updatePayload.start_at = startAt;
    if (dueAt !== undefined) updatePayload.due_at = dueAt;
    if (status !== undefined) {
      updatePayload.status = status;
      if (status === "COMPLETED") {
        updatePayload.completed_at = new Date().toISOString();
      } else {
        updatePayload.completed_at = null;
      }
    }
    if (priority !== undefined) updatePayload.priority = priority;
    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description ? description.trim() : null;
    if (assignedTo !== undefined) updatePayload.assigned_to = assignedTo;

    const { data: updatedTask, error: updateErr } = await supabase
      .from("research_tasks")
      .update(updatePayload)
      .eq("id", id)
      .select(`
        *,
        research_projects (
          id,
          title,
          status
        )
      `)
      .single();

    if (updateErr) {
      throw new Error(`Failed to patch task: ${updateErr.message}`);
    }

    return NextResponse.json({ task: updatedTask });
  } catch (error: any) {
    console.error("PATCH /api/schedule/tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update task." },
      { status: 500 }
    );
  }
}

// DELETE /api/schedule/tasks — Delete a task
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("id");

    if (!taskId) {
      return NextResponse.json({ error: "Task ID is required." }, { status: 400 });
    }

    const { error: deleteErr } = await supabase
      .from("research_tasks")
      .delete()
      .eq("id", taskId)
      .eq("created_by", user.id);

    if (deleteErr) {
      throw new Error(`Failed to delete task: ${deleteErr.message}`);
    }

    return NextResponse.json({ success: true, message: "Task deleted successfully." });
  } catch (error: any) {
    console.error("DELETE /api/schedule/tasks error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete task." },
      { status: 500 }
    );
  }
}

