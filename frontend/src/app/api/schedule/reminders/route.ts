import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/schedule/reminders — List upcoming reminders & unread notifications
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // 1. Fetch user notifications
    const { data: notifications } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // 2. Fetch pending reminders
    const { data: reminders } = await supabase
      .from("research_reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("reminder_at", { ascending: true });

    return NextResponse.json({
      notifications: notifications || [],
      reminders: reminders || [],
    });
  } catch (error: any) {
    console.error("GET /api/schedule/reminders error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch reminders." },
      { status: 500 }
    );
  }
}

// POST /api/schedule/reminders — Configure a new reminder for a task or milestone
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
    const { taskId, milestoneId, reminderAt } = body;

    if (!reminderAt) {
      return NextResponse.json({ error: "Reminder timestamp is required." }, { status: 400 });
    }

    const { data: newReminder, error: insertErr } = await supabase
      .from("research_reminders")
      .insert([
        {
          user_id: user.id,
          task_id: taskId || null,
          milestone_id: milestoneId || null,
          reminder_at: reminderAt,
        },
      ])
      .select("*")
      .single();

    if (insertErr || !newReminder) {
      throw new Error(insertErr?.message || "Failed to set reminder.");
    }

    return NextResponse.json({ reminder: newReminder });
  } catch (error: any) {
    console.error("POST /api/schedule/reminders error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to configure reminder." },
      { status: 500 }
    );
  }
}
