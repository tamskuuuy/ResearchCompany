import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/profile — Fetch current authenticated user's full profile & achievements
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

    // 1. Fetch profile record
    let { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      // Auto-create initial profile if missing
      const initialName = user.user_metadata?.name || user.email?.split("@")[0] || "Researcher";
      const { data: newProfile, error: createErr } = await supabase
        .from("profiles")
        .insert([{ user_id: user.id, name: initialName, email: user.email }])
        .select("*")
        .single();

      if (createErr) throw createErr;
      profile = newProfile;
    }

    // 2. Fetch user's achievements
    const { data: achievements } = await supabase
      .from("research_achievements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // 3. Fetch relational research project stats & selected projects
    const { data: projects } = await supabase
      .from("research_projects")
      .select("id, title, status, description, created_at")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    return NextResponse.json({
      profile: {
        ...profile,
        email: user.email,
      },
      achievements: achievements || [],
      projects: projects || [],
    });
  } catch (error: any) {
    console.error("GET /api/profile error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch profile." },
      { status: 500 }
    );
  }
}

// PUT /api/profile — Update user's researcher profile details & privacy settings
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
    const {
      name,
      username,
      role,
      bio,
      avatar_url,
      institution,
      department,
      academic_level,
      location,
      website,
      orcid,
      google_scholar_url,
      researchgate_url,
      github_url,
      research_interests,
      research_fields,
      skills,
      preferred_methods,
      profile_visibility,
      show_email,
      show_projects,
      show_achievements,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Display name is required." }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      name: name.trim(),
      updated_at: new Date().toISOString(),
    };

    if (username !== undefined) updatePayload.username = username ? username.trim().toLowerCase() : null;
    if (role !== undefined) updatePayload.role = role || null;
    if (bio !== undefined) updatePayload.bio = bio || null;
    if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url || null;
    if (institution !== undefined) updatePayload.institution = institution || null;
    if (department !== undefined) updatePayload.department = department || null;
    if (academic_level !== undefined) updatePayload.academic_level = academic_level || null;
    if (location !== undefined) updatePayload.location = location || null;
    if (website !== undefined) updatePayload.website = website || null;
    if (orcid !== undefined) updatePayload.orcid = orcid || null;
    if (google_scholar_url !== undefined) updatePayload.google_scholar_url = google_scholar_url || null;
    if (researchgate_url !== undefined) updatePayload.researchgate_url = researchgate_url || null;
    if (github_url !== undefined) updatePayload.github_url = github_url || null;
    if (research_interests !== undefined) updatePayload.research_interests = Array.isArray(research_interests) ? research_interests : [];
    if (research_fields !== undefined) updatePayload.research_fields = Array.isArray(research_fields) ? research_fields : [];
    if (skills !== undefined) updatePayload.skills = Array.isArray(skills) ? skills : [];
    if (preferred_methods !== undefined) updatePayload.preferred_methods = Array.isArray(preferred_methods) ? preferred_methods : [];
    if (profile_visibility !== undefined) {
      updatePayload.profile_visibility = ["public", "authenticated", "private"].includes(profile_visibility)
        ? profile_visibility
        : "public";
    }
    if (show_email !== undefined) updatePayload.show_email = Boolean(show_email);
    if (show_projects !== undefined) updatePayload.show_projects = Boolean(show_projects);
    if (show_achievements !== undefined) updatePayload.show_achievements = Boolean(show_achievements);

    let { data: updatedProfile, error: updateErr } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateErr) {
      if (updateErr.code === "23505") {
        return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
      }

      // If PostgREST errors due to missing column (migration 12 not executed on remote DB yet)
      if (updateErr.message?.includes("column") || updateErr.code === "PGRST204") {
        const fallbackPayload: Record<string, any> = {
          name: name.trim(),
          updated_at: new Date().toISOString(),
        };
        if (role !== undefined) fallbackPayload.role = role || null;
        if (bio !== undefined) fallbackPayload.bio = bio || null;
        if (avatar_url !== undefined) fallbackPayload.avatar_url = avatar_url || null;
        if (institution !== undefined) fallbackPayload.institution = institution || null;

        const { data: fallbackProfile, error: fallbackErr } = await supabase
          .from("profiles")
          .update(fallbackPayload)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (fallbackErr) {
          throw new Error(`Failed to update profile: ${fallbackErr.message}`);
        }
        updatedProfile = fallbackProfile;
      } else {
        throw new Error(`Failed to update profile: ${updateErr.message}`);
      }
    }

    return NextResponse.json({ profile: updatedProfile });
  } catch (error: any) {
    console.error("PUT /api/profile error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
