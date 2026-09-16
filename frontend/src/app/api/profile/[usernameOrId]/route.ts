import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/profile/[usernameOrId] — Public/Authenticated researcher profile lookup with privacy enforcement
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ usernameOrId: string }> }
) {
  try {
    const { usernameOrId } = await params;
    const supabase = await createClient();

    // Check optional authenticated user
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    // 1. Fetch profile by username or user_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let query = supabase.from("profiles").select("*");

    if (uuidRegex.test(usernameOrId)) {
      query = query.or(`user_id.eq.${usernameOrId},id.eq.${usernameOrId}`);
    } else {
      query = query.eq("username", usernameOrId.toLowerCase());
    }

    const { data: profile, error } = await query.maybeSingle();

    if (error || !profile) {
      return NextResponse.json({ error: "Researcher profile not found." }, { status: 404 });
    }

    const isOwner = currentUser?.id === profile.user_id;

    // 2. Enforce Privacy Visibility Rules
    if (!isOwner) {
      if (profile.profile_visibility === "private") {
        return NextResponse.json(
          { error: "This researcher profile is set to private." },
          { status: 403 }
        );
      }

      if (profile.profile_visibility === "authenticated" && !currentUser) {
        return NextResponse.json(
          { error: "Sign in required to view this research profile." },
          { status: 401 }
        );
      }
    }

    // 3. Filter sensitive fields according to user's privacy toggles
    const publicProfile = {
      id: profile.id,
      user_id: profile.user_id,
      name: profile.name,
      username: profile.username,
      avatar_url: profile.avatar_url,
      role: profile.role,
      bio: profile.bio,
      institution: profile.institution,
      department: profile.department,
      academic_level: profile.academic_level,
      location: profile.location,
      website: profile.website,
      orcid: profile.orcid,
      google_scholar_url: profile.google_scholar_url,
      researchgate_url: profile.researchgate_url,
      github_url: profile.github_url,
      research_interests: profile.research_interests || [],
      research_fields: profile.research_fields || [],
      skills: profile.skills || [],
      preferred_methods: profile.preferred_methods || [],
      email: isOwner || profile.show_email ? profile.email : undefined,
    };

    // 4. Optionally fetch public research projects if enabled by user
    let publicProjects: any[] = [];
    if (isOwner || profile.show_projects) {
      const { data: projects } = await supabase
        .from("research_projects")
        .select("id, title, description, status, created_at")
        .eq("owner_id", profile.user_id)
        .eq("status", "active");

      publicProjects = projects || [];
    }

    // 5. Optionally fetch achievements if enabled by user
    let publicAchievements: any[] = [];
    if (isOwner || profile.show_achievements) {
      const { data: achievements } = await supabase
        .from("research_achievements")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false });

      publicAchievements = achievements || [];
    }

    return NextResponse.json({
      profile: publicProfile,
      projects: publicProjects,
      achievements: publicAchievements,
      isOwner,
    });
  } catch (error: any) {
    console.error("GET /api/profile/[usernameOrId] error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch researcher profile." },
      { status: 500 }
    );
  }
}
