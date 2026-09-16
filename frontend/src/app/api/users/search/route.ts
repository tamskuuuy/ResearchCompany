import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/users/search — Search researchers by name or email for collaboration
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
    const query = searchParams.get("q") || "";

    let profilesQuery = supabase
      .from("profiles")
      .select("user_id, name, email, role, avatar_url")
      .neq("user_id", user.id)
      .limit(10);

    if (query.trim()) {
      profilesQuery = profilesQuery.or(`name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`);
    }

    const { data: profiles, error } = await profilesQuery;

    if (error) {
      throw new Error(`Failed to search researchers: ${error.message}`);
    }

    return NextResponse.json({ users: profiles || [] });
  } catch (error: any) {
    console.error("GET /api/users/search error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to search researchers." },
      { status: 500 }
    );
  }
}
