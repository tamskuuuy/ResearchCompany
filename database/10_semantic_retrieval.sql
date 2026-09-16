-- ResearchCompany Task 08C-C: Semantic Retrieval RPC with File Name Metadata
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- Drop previous function signature before creating new signature
DROP FUNCTION IF EXISTS public.match_document_chunks(vector, double precision, integer, uuid, uuid[]);

-- Update match_document_chunks RPC to perform a safe INNER JOIN on public.files to retrieve file_name and character_count
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
    character_count integer,
    file_name text,
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
        dc.character_count,
        f.name AS file_name,
        (1 - (dc.embedding <=> query_embedding))::float AS similarity
    FROM public.document_chunks dc
    JOIN public.files f ON dc.file_id = f.id
    WHERE dc.user_id = auth.uid()
      AND f.user_id = auth.uid()
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

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
