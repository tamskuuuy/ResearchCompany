-- ResearchCompany Task 08C-B: Embedding & pgvector Storage Foundation
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add vector embedding and indexing metadata columns to public.document_chunks
ALTER TABLE public.document_chunks
    ADD COLUMN IF NOT EXISTS embedding vector(1536),
    ADD COLUMN IF NOT EXISTS embedding_model TEXT,
    ADD COLUMN IF NOT EXISTS content_hash TEXT;

-- 3. Create HNSW index on document_chunks.embedding using vector_cosine_ops
-- Partial index skipping NULL embeddings for efficiency
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
    ON public.document_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

-- 4. Create secure RPC function match_document_chunks for semantic retrieval
CREATE OR REPLACE FUNCTION public.match_document_chunks (
    query_embedding vector(1536),
    match_threshold float,
    match_count integer,
    p_project_id uuid DEFAULT NULL,
    p_file_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    file_id uuid,
    project_id uuid,
    chunk_index integer,
    content text,
    similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.file_id,
        dc.project_id,
        dc.chunk_index,
        dc.content,
        (1 - (dc.embedding <=> query_embedding))::float AS similarity
    FROM public.document_chunks dc
    WHERE dc.user_id = auth.uid()
      AND dc.embedding IS NOT NULL
      AND (p_project_id IS NULL OR dc.project_id = p_project_id)
      AND (p_file_ids IS NULL OR dc.file_id = ANY(p_file_ids))
      AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.match_document_chunks FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_document_chunks TO authenticated;

-- 5. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
