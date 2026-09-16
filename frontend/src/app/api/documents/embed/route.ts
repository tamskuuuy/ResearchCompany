import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEmbeddingProvider, calculateContentHash } from "@/lib/ai/embeddings";
import { DocumentChunk } from "@/types/database";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

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

    // Rate Limiting Protection (10 embedding requests per minute per user)
    const rateCheck = checkRateLimit(request, "doc_embed", user.id, { windowMs: 60 * 1000, maxRequests: 10 });
    if (!rateCheck.isAllowed) {
      return rateLimitResponse(rateCheck.limit, rateCheck.remaining, rateCheck.reset);
    }

    const body = await request.json();
    const { fileId } = body;

    if (!fileId || typeof fileId !== "string") {
      return NextResponse.json({ error: "fileId is required." }, { status: 400 });
    }

    // 2. Fetch and verify file ownership
    const { data: file, error: fileErr } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fileErr || !file) {
      return NextResponse.json({ error: "File not found or access denied." }, { status: 404 });
    }

    // 3. Fetch all document_chunks for this file
    const { data: rawChunks, error: chunksErr } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("file_id", fileId)
      .eq("user_id", user.id)
      .order("chunk_index", { ascending: true });

    if (chunksErr) {
      return NextResponse.json({ error: "Failed to fetch document chunks." }, { status: 500 });
    }

    const chunks = (rawChunks || []) as DocumentChunk[];

    if (chunks.length === 0) {
      // Mark as completed if file has 0 chunks (empty document)
      await supabase
        .from("files")
        .update({
          vector_indexed: true,
          indexing_status: "completed",
          indexing_error: null,
          indexed_at: new Date().toISOString(),
        })
        .eq("id", fileId);

      return NextResponse.json({
        message: "No chunks to embed. File status updated to completed.",
        fileId,
        chunksEmbedded: 0,
      });
    }

    // 4. Update file status to processing / embedding
    await supabase
      .from("files")
      .update({
        indexing_status: "processing",
        indexing_error: null,
      })
      .eq("id", fileId);

    // 5. Instantiate embedding provider from config
    let embeddingConfig;
    try {
      embeddingConfig = getEmbeddingProvider();
    } catch (err: any) {
      const safeMessage = err?.message || "Embedding provider configuration error.";
      await supabase
        .from("files")
        .update({
          vector_indexed: false,
          indexing_status: "failed",
          indexing_error: safeMessage,
        })
        .eq("id", fileId);

      return NextResponse.json({ error: safeMessage }, { status: 500 });
    }

    const { provider, model, batchSize } = embeddingConfig;

    // 6. Filter chunks needing embedding (Idempotency Check)
    const chunksToEmbed: { chunk: DocumentChunk; hash: string }[] = [];

    for (const chunk of chunks) {
      const hash = calculateContentHash(chunk.content);
      const isAlreadyEmbedded =
        chunk.embedding != null &&
        chunk.embedding_model === model &&
        chunk.content_hash === hash;

      if (!isAlreadyEmbedded) {
        chunksToEmbed.push({ chunk, hash });
      }
    }

    // If all chunks are already embedded with current model & hash
    if (chunksToEmbed.length === 0) {
      await supabase
        .from("files")
        .update({
          vector_indexed: true,
          indexing_status: "completed",
          indexing_error: null,
          indexed_at: new Date().toISOString(),
        })
        .eq("id", fileId);

      return NextResponse.json({
        message: "All document chunks are already up-to-date.",
        fileId,
        chunksEmbedded: 0,
        totalChunks: chunks.length,
      });
    }

    // 7. Process chunks in batches
    let embeddedCount = 0;
    try {
      for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
        const batch = chunksToEmbed.slice(i, i + batchSize);
        const texts = batch.map((item) => item.chunk.content);

        const vectors = await provider.embed(texts);

        // Update database chunks with vectors and metadata
        for (let j = 0; j < batch.length; j++) {
          const { chunk, hash } = batch[j];
          const vector = vectors[j];

          const { error: updateErr } = await supabase
            .from("document_chunks")
            .update({
              embedding: vector,
              embedding_model: model,
              content_hash: hash,
            })
            .eq("id", chunk.id)
            .eq("user_id", user.id);

          if (updateErr) {
            throw new Error(`Failed to update vector for chunk ${chunk.id}: ${updateErr.message}`);
          }
          embeddedCount++;
        }
      }

      // 8. Verify all chunks for this file now have valid embeddings
      const { data: updatedChunks } = await supabase
        .from("document_chunks")
        .select("embedding")
        .eq("file_id", fileId)
        .eq("user_id", user.id);

      const allValid =
        updatedChunks &&
        updatedChunks.length === chunks.length &&
        updatedChunks.every((c) => c.embedding != null);

      if (allValid) {
        await supabase
          .from("files")
          .update({
            vector_indexed: true,
            indexing_status: "completed",
            indexing_error: null,
            indexed_at: new Date().toISOString(),
          })
          .eq("id", fileId);
      } else {
        await supabase
          .from("files")
          .update({
            vector_indexed: false,
            indexing_status: "processing",
            indexing_error: "Partial embedding complete.",
          })
          .eq("id", fileId);
      }

      return NextResponse.json({
        message: "Document chunks successfully embedded.",
        fileId,
        chunksEmbedded: embeddedCount,
        totalChunks: chunks.length,
      });
    } catch (err: any) {
      console.error("Embedding generation error:", err);
      const safeErrorMsg = err?.message || "Failed to generate document embeddings.";
      
      await supabase
        .from("files")
        .update({
          vector_indexed: false,
          indexing_status: "failed",
          indexing_error: safeErrorMsg,
        })
        .eq("id", fileId);

      return NextResponse.json({ error: safeErrorMsg }, { status: 500 });
    }
  } catch (error: any) {
    console.error("API /api/documents/embed error:", error);
    return NextResponse.json(
      { error: error?.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
