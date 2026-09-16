-- ResearchCompany Task 06 v2: Federated Citation Schema Extension Script
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Safely add missing federated metadata & provenance columns to public.citations
ALTER TABLE public.citations
    ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openalex',
    ADD COLUMN IF NOT EXISTS provider_id TEXT,
    ADD COLUMN IF NOT EXISTS retrieved_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS source_url TEXT,
    ADD COLUMN IF NOT EXISTS open_access_url TEXT,
    ADD COLUMN IF NOT EXISTS indexed_sources TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS researchcompany_relevance NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS metadata_retrieved_at TIMESTAMPTZ DEFAULT now();

-- 2. Performance indexes
CREATE INDEX IF NOT EXISTS idx_citations_provider ON public.citations(provider);
CREATE INDEX IF NOT EXISTS idx_citations_provider_id ON public.citations(provider_id);

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
