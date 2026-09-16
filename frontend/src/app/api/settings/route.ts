import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Default settings fallback
const DEFAULT_SETTINGS = {
  default_project_visibility: "private",
  default_task_priority: "MEDIUM",
  default_task_status: "TODO",
  default_citation_format: "APA",
  timezone: "UTC",
  timeline_view: "MONTH",
  ai_provider: "auto",
  ai_model: "gpt-4o-mini",
  ai_temperature: 0.7,
  retrieval_enabled: true,
  top_k: 8,
  similarity_threshold: 0.70,
  response_style: "balanced",
  include_citations_by_default: true,
  prefer_project_context: true,
  notify_messages: true,
  notify_task_assignments: true,
  notify_deadlines: true,
  notify_milestones: true,
  in_app_notifications: true,
  quiet_hours_enabled: false,
  quiet_hours_start: "22:00",
  quiet_hours_end: "08:00",
};

// GET /api/settings — Fetch authenticated user's settings (auto-create if missing)
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

    let { data: settings, error: fetchErr } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr && !fetchErr.message?.includes("column")) {
      console.warn("Error fetching user settings:", fetchErr.message);
    }

    if (!settings) {
      // Auto-create initial settings row
      const { data: newSettings, error: createErr } = await supabase
        .from("user_settings")
        .insert([{ user_id: user.id, ...DEFAULT_SETTINGS }])
        .select("*")
        .maybeSingle();

      if (!createErr && newSettings) {
        settings = newSettings;
      } else {
        // Fallback to default in-memory settings if table not migrated yet
        settings = { user_id: user.id, ...DEFAULT_SETTINGS };
      }
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch settings." },
      { status: 500 }
    );
  }
}

// PATCH /api/settings — Update user-level preferences
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
    const {
      default_project_visibility,
      default_task_priority,
      default_task_status,
      default_citation_format,
      timezone,
      timeline_view,
      ai_provider,
      ai_model,
      ai_temperature,
      retrieval_enabled,
      top_k,
      similarity_threshold,
      response_style,
      include_citations_by_default,
      prefer_project_context,
      notify_messages,
      notify_task_assignments,
      notify_deadlines,
      notify_milestones,
      in_app_notifications,
      quiet_hours_enabled,
      quiet_hours_start,
      quiet_hours_end,
    } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // Validations & Sanitize Payload
    if (default_project_visibility && ["public", "private", "team"].includes(default_project_visibility)) {
      updatePayload.default_project_visibility = default_project_visibility;
    }
    if (default_task_priority && ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(default_task_priority)) {
      updatePayload.default_task_priority = default_task_priority;
    }
    if (default_task_status && ["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED"].includes(default_task_status)) {
      updatePayload.default_task_status = default_task_status;
    }
    if (default_citation_format && ["APA", "MLA", "IEEE", "Chicago"].includes(default_citation_format)) {
      updatePayload.default_citation_format = default_citation_format;
    }
    if (timezone !== undefined) updatePayload.timezone = String(timezone);
    if (timeline_view && ["DAY", "WEEK", "MONTH"].includes(timeline_view)) {
      updatePayload.timeline_view = timeline_view;
    }
    if (ai_provider && ["auto", "openrouter", "openai"].includes(ai_provider)) {
      updatePayload.ai_provider = ai_provider;
    }
    if (ai_model !== undefined) updatePayload.ai_model = String(ai_model);
    if (typeof ai_temperature === "number" && ai_temperature >= 0 && ai_temperature <= 2) {
      updatePayload.ai_temperature = ai_temperature;
    }
    if (typeof retrieval_enabled === "boolean") updatePayload.retrieval_enabled = retrieval_enabled;
    if (typeof top_k === "number" && top_k >= 1 && top_k <= 50) updatePayload.top_k = top_k;
    if (typeof similarity_threshold === "number" && similarity_threshold >= 0 && similarity_threshold <= 1) {
      updatePayload.similarity_threshold = similarity_threshold;
    }
    if (response_style && ["concise", "balanced", "detailed"].includes(response_style)) {
      updatePayload.response_style = response_style;
    }
    if (typeof include_citations_by_default === "boolean") updatePayload.include_citations_by_default = include_citations_by_default;
    if (typeof prefer_project_context === "boolean") updatePayload.prefer_project_context = prefer_project_context;
    if (typeof notify_messages === "boolean") updatePayload.notify_messages = notify_messages;
    if (typeof notify_task_assignments === "boolean") updatePayload.notify_task_assignments = notify_task_assignments;
    if (typeof notify_deadlines === "boolean") updatePayload.notify_deadlines = notify_deadlines;
    if (typeof notify_milestones === "boolean") updatePayload.notify_milestones = notify_milestones;
    if (typeof in_app_notifications === "boolean") updatePayload.in_app_notifications = in_app_notifications;
    if (typeof quiet_hours_enabled === "boolean") updatePayload.quiet_hours_enabled = quiet_hours_enabled;
    if (quiet_hours_start !== undefined) updatePayload.quiet_hours_start = quiet_hours_start;
    if (quiet_hours_end !== undefined) updatePayload.quiet_hours_end = quiet_hours_end;

    // Upsert settings into Supabase
    const { data: updatedSettings, error: upsertErr } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, ...updatePayload }, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();

    if (upsertErr) {
      console.warn("Failed to persist user settings to database:", upsertErr.message);
      // Fallback return if table not created on remote DB yet
      return NextResponse.json({ settings: { user_id: user.id, ...DEFAULT_SETTINGS, ...updatePayload } });
    }

    return NextResponse.json({ settings: updatedSettings });
  } catch (error: any) {
    console.error("PATCH /api/settings error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update settings." },
      { status: 500 }
    );
  }
}
