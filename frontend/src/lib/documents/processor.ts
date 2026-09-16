import { SupabaseClient } from "@supabase/supabase-js";
import { extractText } from "./extractor";
import { cleanText } from "./cleaner";
import { chunkText } from "./chunker";

export interface ProcessingResult {
  success: boolean;
  fileId: string;
  chunksCreated: number;
  characterCount: number;
  error?: string;
}

/**
 * Orchestrates server-side document downloading, extraction, cleaning, chunking, and db replacement.
 */
export async function processDocument(
  supabase: SupabaseClient,
  fileId: string,
  userId: string
): Promise<ProcessingResult> {
  // 1. Fetch file record & verify ownership
  const { data: fileRecord, error: fileErr } = await supabase
    .from("files")
    .select("*")
    .eq("id", fileId)
    .eq("user_id", userId)
    .single();

  if (fileErr || !fileRecord) {
    return {
      success: false,
      fileId,
      chunksCreated: 0,
      characterCount: 0,
      error: "File record not found or access denied.",
    };
  }

  // 2. Set status to processing
  await supabase
    .from("files")
    .update({
      indexing_status: "processing",
      indexing_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId);

  try {
    // 3. Download raw file binary from private research-files bucket
    const { data: blobData, error: downloadErr } = await supabase.storage
      .from("research-files")
      .download(fileRecord.file_path);

    if (downloadErr || !blobData) {
      throw new Error(`Failed to download document from storage: ${downloadErr?.message || "Empty stream"}`);
    }

    const arrayBuffer = await blobData.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // 4. Extract raw text
    const extracted = await extractText(
      fileBuffer,
      fileRecord.mime_type || "",
      fileRecord.name
    );

    // 5. Clean text conservatively
    const cleaned = cleanText(extracted.text);
    if (!cleaned || cleaned.length < 5) {
      throw new Error("Unable to extract readable text from this document. File may contain scanned images without OCR.");
    }

    // 6. Generate deterministic chunks
    const chunks = chunkText(cleaned, { chunkSize: 1000, chunkOverlap: 150 });
    if (chunks.length === 0) {
      throw new Error("No valid content chunks generated from document.");
    }

    // 7. Idempotent Replacement: Delete existing chunks for this file
    const { error: deleteErr } = await supabase
      .from("document_chunks")
      .delete()
      .eq("file_id", fileId)
      .eq("user_id", userId);

    if (deleteErr) {
      throw new Error(`Failed to clear existing chunks: ${deleteErr.message}`);
    }

    // 8. Insert new chunks in batch
    const insertPayload = chunks.map((c) => ({
      file_id: fileId,
      project_id: fileRecord.project_id,
      user_id: userId,
      chunk_index: c.chunkIndex,
      content: c.content,
      character_count: c.characterCount,
    }));

    const { error: insertErr } = await supabase
      .from("document_chunks")
      .insert(insertPayload);

    if (insertErr) {
      throw new Error(`Failed to store document chunks: ${insertErr.message}`);
    }

    // 9. Update file indexing status to completed
    const nowIso = new Date().toISOString();
    await supabase
      .from("files")
      .update({
        indexing_status: "completed",
        vector_indexed: true,
        indexing_error: null,
        extracted_at: nowIso,
        indexed_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", fileId);

    return {
      success: true,
      fileId,
      chunksCreated: chunks.length,
      characterCount: cleaned.length,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Document processing failed.";
    console.error(`[Document Processor Error] File ${fileId}:`, errorMsg);

    // Update status to failed
    await supabase
      .from("files")
      .update({
        indexing_status: "failed",
        indexing_error: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", fileId);

    return {
      success: false,
      fileId,
      chunksCreated: 0,
      characterCount: 0,
      error: errorMsg,
    };
  }
}
