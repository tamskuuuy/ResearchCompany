import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /api/profile/achievements — Add a new manual research publication/award/grant
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
    const { title, venue_or_issuer, year, url, category = "publication" } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Achievement title is required." }, { status: 400 });
    }

    const { data: newAchievement, error: insertErr } = await supabase
      .from("research_achievements")
      .insert([
        {
          user_id: user.id,
          title: title.trim(),
          venue_or_issuer: venue_or_issuer ? venue_or_issuer.trim() : null,
          year: year ? year.trim() : null,
          url: url ? url.trim() : null,
          category: ["publication", "award", "grant", "patent"].includes(category)
            ? category
            : "publication",
        },
      ])
      .select("*")
      .single();

    if (insertErr || !newAchievement) {
      throw new Error(insertErr?.message || "Failed to create achievement record.");
    }

    return NextResponse.json({ achievement: newAchievement });
  } catch (error: any) {
    console.error("POST /api/profile/achievements error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to add achievement." },
      { status: 500 }
    );
  }
}

// DELETE /api/profile/achievements — Delete an achievement record owned by the user
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
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Achievement id is required." }, { status: 400 });
    }

    const { error: deleteErr } = await supabase
      .from("research_achievements")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteErr) {
      throw new Error(`Failed to delete achievement: ${deleteErr.message}`);
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("DELETE /api/profile/achievements error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete achievement." },
      { status: 500 }
    );
  }
}
