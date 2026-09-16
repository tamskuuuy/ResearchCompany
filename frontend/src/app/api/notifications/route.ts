import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/notifications — Fetch authenticated user's notifications with pagination & unread count
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
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 1. Fetch total unread notifications count (Source of truth)
    const { count: unreadCount, error: countErr } = await supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (countErr) {
      console.warn("Unread notifications count query warning:", countErr.message);
    }

    // 2. Fetch paginated notifications
    const { data: rawNotifications, error: fetchErr } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchErr) {
      throw new Error(`Failed to fetch notifications: ${fetchErr.message}`);
    }

    const notifications = rawNotifications || [];

    // 3. Enrich notifications with actor profiles if actor_user_id exists
    const actorUserIds = Array.from(
      new Set(notifications.map((n) => n.actor_user_id).filter(Boolean))
    );

    let actorProfilesMap: Record<string, { name: string; avatar_url: string | null }> = {};

    if (actorUserIds.length > 0) {
      const { data: actorProfiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", actorUserIds);

      if (actorProfiles) {
        actorProfilesMap = Object.fromEntries(
          actorProfiles.map((p) => [p.user_id, { name: p.name, avatar_url: p.avatar_url }])
        );
      }
    }

    const enrichedNotifications = notifications.map((n) => ({
      ...n,
      actor_profile: n.actor_user_id ? actorProfilesMap[n.actor_user_id] || null : null,
    }));

    return NextResponse.json({
      notifications: enrichedNotifications,
      unreadCount: unreadCount || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

// PATCH /api/notifications — Mark a single notification or all notifications as read
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
    const { id, markAllRead } = body;

    const nowIso = new Date().toISOString();

    if (markAllRead) {
      // Mark all unread notifications for this user as read
      const { error: updateErr } = await supabase
        .from("user_notifications")
        .update({ read_at: nowIso })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (updateErr) {
        throw new Error(`Failed to mark all as read: ${updateErr.message}`);
      }

      return NextResponse.json({ success: true, message: "All notifications marked as read." });
    }

    if (!id) {
      return NextResponse.json({ error: "Notification ID is required." }, { status: 400 });
    }

    // Mark single notification as read (must belong to user)
    const { data: updatedNotification, error: updateSingleErr } = await supabase
      .from("user_notifications")
      .update({ read_at: nowIso })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateSingleErr) {
      throw new Error(`Failed to mark notification as read: ${updateSingleErr.message}`);
    }

    return NextResponse.json({ notification: updatedNotification });
  } catch (error: any) {
    console.error("PATCH /api/notifications error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update notification." },
      { status: 500 }
    );
  }
}
