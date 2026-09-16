import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/schedule/milestones — List research milestones with linked project context
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

    let query = supabase
      .from("research_milestones")
      .select(`
        *,
        research_projects (
          id,
          title,
          status
        )
      `)
      .order("target_date", { ascending: true });

    if (projectId) {
      query = query.eq("project_id", projectId);
    }

    const { data: milestones, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch milestones: ${error.message}`);
    }

    return NextResponse.json({ milestones: milestones || [] });
  } catch (error: any) {
    console.error("GET /api/schedule/milestones error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch milestones." },
      { status: 500 }
    );
  }
}

// POST /api/schedule/milestones — Create a new project milestone
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
    const { title, description, projectId, targetDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Milestone title is required." }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "Target research project is required." }, { status: 400 });
    }

    if (!targetDate) {
      return NextResponse.json({ error: "Target completion date is required." }, { status: 400 });
    }

    // Verify project ownership
    const { data: proj } = await supabase
      .from("research_projects")
      .select("id")
      .eq("id", projectId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!proj) {
      return NextResponse.json({ error: "Project not found or access denied." }, { status: 403 });
    }

    const { data: newMilestone, error: insertErr } = await supabase
      .from("research_milestones")
      .insert([
        {
          project_id: projectId,
          created_by: user.id,
          title: title.trim(),
          description: description ? description.trim() : null,
          target_date: targetDate,
        },
      ])
      .select("*")
      .single();

    if (insertErr || !newMilestone) {
      throw new Error(insertErr?.message || "Failed to create milestone.");
    }

    return NextResponse.json({ milestone: newMilestone });
  } catch (error: any) {
    console.error("POST /api/schedule/milestones error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create milestone." },
      { status: 500 }
    );
  }
}

// PATCH /api/schedule/milestones — Update milestone target_date or title
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
    const { id, targetDate, title, description } = body;

    if (!id) {
      return NextResponse.json({ error: "Milestone id is required." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (targetDate !== undefined) updatePayload.target_date = targetDate;
    if (title !== undefined) updatePayload.title = title.trim();
    if (description !== undefined) updatePayload.description = description ? description.trim() : null;

    const { data: updatedMilestone, error: updateErr } = await supabase
      .from("research_milestones")
      .update(updatePayload)
      .eq("id", id)
      .eq("created_by", user.id)
      .select("*")
      .single();

    if (updateErr) {
      throw new Error(`Failed to update milestone: ${updateErr.message}`);
    }

    return NextResponse.json({ milestone: updatedMilestone });
  } catch (error: any) {
    console.error("PATCH /api/schedule/milestones error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update milestone." },
      { status: 500 }
    );
  }
}

