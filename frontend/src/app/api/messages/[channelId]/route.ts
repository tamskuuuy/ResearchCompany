import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/messages/[channelId] — Retrieve message history for a channel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // 1. Verify user membership in channel
    const { data: membership, error: memErr } = await supabase
      .from("channel_members")
      .select("id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr || !membership) {
      return NextResponse.json(
        { error: "Channel not found or access denied." },
        { status: 403 }
      );
    }

    // 2. Fetch channel metadata with research project link
    const { data: channel } = await supabase
      .from("collaboration_channels")
      .select(`
        *,
        research_projects (
          id,
          title,
          status,
          description
        )
      `)
      .eq("id", channelId)
      .single();

    // 3. Fetch channel members with user profiles
    const { data: members } = await supabase
      .from("channel_members")
      .select("user_id, joined_at")
      .eq("channel_id", channelId);

    const memberUserIds = (members || []).map((m) => m.user_id);
    const { data: memberProfiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, role, email")
      .in("user_id", memberUserIds);

    // 4. Fetch user messages for channel ordered chronologically
    const { data: messages, error: msgErr } = await supabase
      .from("user_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (msgErr) {
      throw new Error(`Failed to fetch messages: ${msgErr.message}`);
    }

    // 5. Update last_read_at timestamp for authenticated user
    await supabase
      .from("channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("user_id", user.id);

    return NextResponse.json({
      channel: {
        ...channel,
        members: memberProfiles || [],
      },
      messages: messages || [],
    });
  } catch (error: any) {
    console.error("GET /api/messages/[channelId] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch channel thread." },
      { status: 500 }
    );
  }
}

// POST /api/messages/[channelId] — Send a new user-to-user message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }

    // 1. Verify user membership in channel
    const { data: membership } = await supabase
      .from("channel_members")
      .select("id")
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this channel." },
        { status: 403 }
      );
    }

    // 2. Insert message into public.user_messages
    const { data: newMessage, error: insertErr } = await supabase
      .from("user_messages")
      .insert([
        {
          channel_id: channelId,
          sender_id: user.id,
          content: content.trim(),
        },
      ])
      .select("*")
      .single();

    if (insertErr || !newMessage) {
      throw new Error(insertErr?.message || "Failed to send message.");
    }

    // 3. Update channel updated_at timestamp
    await supabase
      .from("collaboration_channels")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", channelId);

    // 4. Update sender's last_read_at timestamp
    await supabase
      .from("channel_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("channel_id", channelId)
      .eq("user_id", user.id);

    return NextResponse.json({ message: newMessage });
  } catch (error: any) {
    console.error("POST /api/messages/[channelId] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send message." },
      { status: 500 }
    );
  }
}
