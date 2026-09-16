import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CitationSearchService } from "@/lib/citations/orchestrator";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  // 1. Verify user authentication via SSR Supabase client
  const supabase = await createClient();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
  }

  // Rate Limiting Protection (30 citation searches per minute per user)
  const rateCheck = checkRateLimit(request, "citation_search", user.id, { windowMs: 60 * 1000, maxRequests: 30 });
  if (!rateCheck.isAllowed) {
    return rateLimitResponse(rateCheck.limit, rateCheck.remaining, rateCheck.reset);
  }
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query") || "";
  const rows = parseInt(searchParams.get("rows") || "15", 10);
  const yearStr = searchParams.get("year");
  const openAccessOnly = searchParams.get("openAccess") === "true";
  const sortBy = (searchParams.get("sortBy") as any) || "relevance";

  if (!query.trim()) {
    return NextResponse.json({ citations: [], totalResults: 0, diagnostics: [] });
  }

  const year = yearStr ? parseInt(yearStr, 10) : null;

  try {
    const service = new CitationSearchService();
    const results = await service.searchAll({
      query,
      rows,
      year,
      openAccessOnly,
      sortBy,
    });

    return NextResponse.json(results);
  } catch (error: any) {
    console.error("API /api/citations/search error:", error);
    return NextResponse.json(
      { error: error?.message || "Federated citation service is temporarily unavailable." },
      { status: 500 }
    );
  }
}
