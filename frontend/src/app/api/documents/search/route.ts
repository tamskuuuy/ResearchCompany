import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SemanticRetrievalService } from "@/lib/ai/retrieval";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user via SSR Supabase client
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
    }

    const { query, projectId, fileIds, matchThreshold, matchCount } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ error: "Search query is required and cannot be empty." }, { status: 400 });
    }

    if (query.trim().length > 2000) {
      return NextResponse.json(
        { error: "Search query exceeds maximum allowed length of 2000 characters." },
        { status: 400 }
      );
    }

    // 3. Execute semantic retrieval
    const retrievalService = new SemanticRetrievalService(supabase);
    const results = await retrievalService.retrieve(query.trim(), {
      projectId: typeof projectId === "string" ? projectId : undefined,
      fileIds: Array.isArray(fileIds) ? fileIds.filter((id): id is string => typeof id === "string") : undefined,
      matchThreshold: typeof matchThreshold === "number" ? matchThreshold : undefined,
      matchCount: typeof matchCount === "number" ? matchCount : undefined,
    });

    return NextResponse.json({
      success: true,
      query: query.trim(),
      resultsCount: results.length,
      results,
    });
  } catch (error: any) {
    console.error("API /api/documents/search error:", error?.message || error);
    const safeErrorMsg = error?.message || "An error occurred during document search.";

    // Determine status code based on error validation message
    let status = 500;
    if (
      safeErrorMsg.includes("cannot be empty") ||
      safeErrorMsg.includes("exceeds maximum") ||
      safeErrorMsg.includes("Invalid") ||
      safeErrorMsg.includes("must be")
    ) {
      status = 400;
    }

    return NextResponse.json({ error: safeErrorMsg }, { status });
  }
}
