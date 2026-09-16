import { SupabaseClient } from "@supabase/supabase-js";
import { getEmbeddingProvider } from "@/lib/ai/embeddings";

export type RetrievalOptions = {
  projectId?: string;
  fileIds?: string[];
  matchThreshold?: number;
  matchCount?: number;
};

export type RetrievedChunk = {
  id: string;
  fileId: string;
  projectId: string;
  chunkIndex: number;
  content: string;
  characterCount: number;
  fileName?: string;
  similarity: number;
};

export class SemanticRetrievalService {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  async retrieve(query: string, options?: RetrievalOptions): Promise<RetrievedChunk[]> {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      throw new Error("Search query cannot be empty.");
    }

    if (trimmedQuery.length > 2000) {
      throw new Error("Search query exceeds maximum length of 2000 characters.");
    }

    // Parse and validate configurable threshold and matchCount
    const defaultThreshold = parseFloat(process.env.RAG_MATCH_THRESHOLD || "0.70");
    const defaultMatchCount = parseInt(process.env.RAG_MATCH_COUNT || "8", 10);

    const matchThreshold = options?.matchThreshold ?? defaultThreshold;
    const matchCount = options?.matchCount ?? defaultMatchCount;

    if (isNaN(matchThreshold) || matchThreshold < 0 || matchThreshold > 1) {
      throw new Error("matchThreshold must be a number between 0 and 1.");
    }

    if (isNaN(matchCount) || matchCount < 1 || matchCount > 50) {
      throw new Error("matchCount must be an integer between 1 and 50.");
    }

    // Validate optional filter UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (options?.projectId && !uuidRegex.test(options.projectId)) {
      throw new Error("Invalid projectId format. Must be a valid UUID.");
    }

    if (options?.fileIds && options.fileIds.length > 0) {
      for (const id of options.fileIds) {
        if (!uuidRegex.test(id)) {
          throw new Error(`Invalid fileId format (${id}). Must be a valid UUID.`);
        }
      }
    }

    // 1. Generate query embedding using existing provider infrastructure (exactly 1 embedding call)
    const { provider, dimension } = getEmbeddingProvider();
    const [queryVector] = await provider.embed([trimmedQuery]);

    if (!queryVector || queryVector.length !== dimension) {
      throw new Error(`Query embedding dimension mismatch. Expected ${dimension}, got ${queryVector?.length ?? 0}`);
    }

    // 2. Call match_document_chunks RPC via Supabase server client (enforces dc.user_id = auth.uid())
    const { data: rawRpcData, error: rpcError } = await this.supabase.rpc("match_document_chunks", {
      query_embedding: queryVector,
      match_threshold: matchThreshold,
      match_count: matchCount,
      p_project_id: options?.projectId || null,
      p_file_ids: options?.fileIds && options.fileIds.length > 0 ? options.fileIds : null,
    });

    if (rpcError) {
      console.error("Supabase RPC match_document_chunks error:", rpcError.message);
      throw new Error("Failed to execute semantic document retrieval.");
    }

    if (!rawRpcData || !Array.isArray(rawRpcData)) {
      return [];
    }

    // 3. Format and return ranked retrieved chunks (sorted descending by similarity)
    const retrievedChunks: RetrievedChunk[] = rawRpcData.map((row: any) => ({
      id: row.id,
      fileId: row.file_id,
      projectId: row.project_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      characterCount: row.character_count ?? row.content?.length ?? 0,
      fileName: row.file_name || undefined,
      similarity: typeof row.similarity === "number" ? parseFloat(row.similarity.toFixed(4)) : 0,
    }));

    // Ensure strict similarity descending sorting
    retrievedChunks.sort((a, b) => b.similarity - a.similarity);

    return retrievedChunks;
  }
}
