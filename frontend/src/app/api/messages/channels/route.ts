import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/messages/channels — List user's channels with latest message preview & unread counts
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

    // 1. Fetch channel memberships for authenticated user
    const { data: memberRows, error: memberErr } = await supabase
      .from("channel_members")
      .select("channel_id, last_read_at")
      .eq("user_id", user.id);

    if (memberErr) {
      throw new Error(`Failed to fetch channel memberships: ${memberErr.message}`);
    }

    if (!memberRows || memberRows.length === 0) {
      return NextResponse.json({ channels: [] });
    }

    const channelIds = memberRows.map((m) => m.channel_id);
    const lastReadMap = new Map(memberRows.map((m) => [m.channel_id, m.last_read_at]));

    // 2. Fetch channels with linked research_projects metadata
    const { data: channels, error: channelErr } = await supabase
      .from("collaboration_channels")
      .select(`
        *,
        research_projects (
          id,
          title,
          status
        )
      `)
      .in("id", channelIds)
      .order("updated_at", { ascending: false });

    if (channelErr) {
      throw new Error(`Failed to fetch channels: ${channelErr.message}`);
    }

    // 3. Enrich channels with members profiles, latest message preview, and unread counts
    const enrichedChannels = await Promise.all(
      (channels || []).map(async (channel) => {
        // Fetch all members of this channel
        const { data: members } = await supabase
          .from("channel_members")
          .select("user_id, joined_at")
          .eq("channel_id", channel.id);

        const memberUserIds = (members || []).map((m) => m.user_id);

        // Fetch user profiles for participants
        const { data: memberProfiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url, role")
          .in("user_id", memberUserIds);

        // Fetch latest message
        const { data: latestMsgs } = await supabase
          .from("user_messages")
          .select("id, content, created_at, sender_id")
          .eq("channel_id", channel.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const latestMsg = latestMsgs && latestMsgs.length > 0 ? latestMsgs[0] : null;

        // Calculate unread count
        const lastReadAt = lastReadMap.get(channel.id) || new Date(0).toISOString();
        const { count: unreadCount } = await supabase
          .from("user_messages")
          .select("id", { count: "exact", head: true })
          .eq("channel_id", channel.id)
          .gt("created_at", lastReadAt)
          .neq("sender_id", user.id);

        return {
          ...channel,
          members: memberProfiles || [],
          latestMessage: latestMsg,
          unreadCount: unreadCount || 0,
        };
      })
    );

    return NextResponse.json({ channels: enrichedChannels });
  } catch (error: any) {
    console.error("GET /api/messages/channels error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch channels." },
      { status: 500 }
    );
  }
}

// POST /api/messages/channels — Create new DM or Project Group channel
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
    const { title, type = "dm", targetUserId, projectId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Channel title is required." }, { status: 400 });
    }

    // 1. Create collaboration channel
    const { data: newChannel, error: createErr } = await supabase
      .from("collaboration_channels")
      .insert([
        {
          created_by: user.id,
          title: title.trim(),
          type: type === "project_group" ? "project_group" : "dm",
          project_id: projectId || null,
        },
      ])
      .select("*")
      .single();

    if (createErr || !newChannel) {
      throw new Error(createErr?.message || "Failed to create channel.");
    }

    // 2. Add creator to channel_members
    const membersToInsert = [{ channel_id: newChannel.id, user_id: user.id }];

    // If DM with targetUserId, add recipient as well
    if (targetUserId && targetUserId !== user.id) {
      membersToInsert.push({ channel_id: newChannel.id, user_id: targetUserId });
    }

    const { error: memberErr } = await supabase
      .from("channel_members")
      .insert(membersToInsert);

    if (memberErr) {
      throw new Error(`Failed to add members: ${memberErr.message}`);
    }

    return NextResponse.json({ channel: newChannel });
  } catch (error: any) {
    console.error("POST /api/messages/channels error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create channel." },
      { status: 500 }
    );
  }
}
