-- ResearchCompany Task 08B: Document Processing Foundation & Text Chunks Schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Extend public.files with indexing status columns
ALTER TABLE public.files
    ADD COLUMN IF NOT EXISTS indexing_status TEXT DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'processing', 'completed', 'failed')),
    ADD COLUMN IF NOT EXISTS indexing_error TEXT,
    ADD COLUMN IF NOT EXISTS extracted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS indexed_at TIMESTAMPTZ;

-- 2. Create public.document_chunks table
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    character_count INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_file_chunk_index UNIQUE (file_id, chunk_index)
);

-- 3. Indexes for fast document chunk retrieval
CREATE INDEX IF NOT EXISTS idx_document_chunks_file_id ON public.document_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_project_id ON public.document_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);

-- 4. Enable Row Level Security (RLS) on document_chunks
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- 5. User Ownership RLS Policies for document_chunks
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own document chunks" ON public.document_chunks;
    DROP POLICY IF EXISTS "Users can insert their own document chunks" ON public.document_chunks;
    DROP POLICY IF EXISTS "Users can update their own document chunks" ON public.document_chunks;
    DROP POLICY IF EXISTS "Users can delete their own document chunks" ON public.document_chunks;
END $$;

CREATE POLICY "Users can view their own document chunks"
    ON public.document_chunks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own document chunks"
    ON public.document_chunks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own document chunks"
    ON public.document_chunks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own document chunks"
    ON public.document_chunks FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
