import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processDocument } from "@/lib/documents/processor";

export async function POST(request: NextRequest) {
  try {
    // 1. Verify user authentication via SSR Supabase client
    const supabase = await createClient();
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json(
        { error: "Invalid request payload. Parameter 'fileId' is required." },
        { status: 400 }
      );
    }

    // 2. Execute server-side document processing pipeline
    const result = await processDocument(supabase, fileId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, fileId, error: result.error || "Document indexing failed." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      fileId: result.fileId,
      chunksCreated: result.chunksCreated,
      characterCount: result.characterCount,
    });
  } catch (err: unknown) {
    console.error("API /api/documents/index error:", err);
    const msg = err instanceof Error ? err.message : "Document indexing service encounterd an unexpected error.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
