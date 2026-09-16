-- ResearchCompany Task 06: Citation Table Schema Extension Script
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Safely add missing columns to public.citations
ALTER TABLE public.citations
    ADD COLUMN IF NOT EXISTS source_provider TEXT DEFAULT 'Crossref',
    ADD COLUMN IF NOT EXISTS external_id TEXT,
    ADD COLUMN IF NOT EXISTS publication_year INT,
    ADD COLUMN IF NOT EXISTS publisher TEXT,
    ADD COLUMN IF NOT EXISTS url TEXT,
    ADD COLUMN IF NOT EXISTS abstract TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS is_open_access BOOLEAN DEFAULT false;

-- 2. Indexes for performance and quick retrieval
CREATE INDEX IF NOT EXISTS idx_citations_owner_id ON public.citations(user_id);
CREATE INDEX IF NOT EXISTS idx_citations_project_id ON public.citations(project_id);
CREATE INDEX IF NOT EXISTS idx_citations_doi ON public.citations(doi);
CREATE INDEX IF NOT EXISTS idx_citations_created_at ON public.citations(created_at);

-- 3. Unique partial index on (project_id, lower(trim(doi))) to prevent duplicate DOI saves per project
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'citations' AND indexname = 'unique_project_doi_idx'
    ) THEN
        CREATE UNIQUE INDEX unique_project_doi_idx 
            ON public.citations(project_id, lower(trim(doi))) 
            WHERE doi IS NOT NULL AND trim(doi) <> '';
    END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
