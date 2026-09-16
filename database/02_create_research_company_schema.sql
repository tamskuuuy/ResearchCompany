-- ResearchCompany Migration Task 04: Full Relational Schema & Row Level Security (RLS)
-- Run this script in your Supabase SQL Editor to provision tables and policies.

-- 1. Extend profiles table if needed
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Researcher',
    ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Create research_projects table
CREATE TABLE IF NOT EXISTS public.research_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for owner_id project lookups
CREATE INDEX IF NOT EXISTS idx_research_projects_owner_id ON public.research_projects(owner_id);

-- Trigger for automatic updated_at timestamp on research_projects
DROP TRIGGER IF EXISTS on_research_project_updated ON public.research_projects;
CREATE TRIGGER on_research_project_updated
    BEFORE UPDATE ON public.research_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 3. Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create files table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    size_bytes BIGINT DEFAULT 0,
    mime_type TEXT,
    tags TEXT[] DEFAULT '{}',
    vector_indexed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create citations table
CREATE TABLE IF NOT EXISTS public.citations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    journal TEXT,
    year TEXT,
    doi TEXT,
    apa TEXT,
    bibtex TEXT,
    citations_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'ai')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Create schedule_events table
CREATE TABLE IF NOT EXISTS public.schedule_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General',
    due_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in-progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for research_projects
CREATE POLICY "Users can view their own projects."
    ON public.research_projects FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own projects."
    ON public.research_projects FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own projects."
    ON public.research_projects FOR UPDATE
    USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own projects."
    ON public.research_projects FOR DELETE
    USING (auth.uid() = owner_id);

-- 11. RLS Policies for folders
CREATE POLICY "Users can view folders in their projects."
    ON public.folders FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert folders in their projects."
    ON public.folders FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update folders in their projects."
    ON public.folders FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete folders in their projects."
    ON public.folders FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()
        )
    );

-- 12. RLS Policies for files
CREATE POLICY "Users can view files in their projects."
    ON public.files FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert files in their projects."
    ON public.files FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update files in their projects."
    ON public.files FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete files in their projects."
    ON public.files FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()
        )
    );

-- 13. RLS Policies for citations
CREATE POLICY "Users can view citations in their projects."
    ON public.citations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert citations in their projects."
    ON public.citations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update citations in their projects."
    ON public.citations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete citations in their projects."
    ON public.citations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()
        )
    );

-- 14. RLS Policies for conversations & messages
CREATE POLICY "Users can view conversations in their projects."
    ON public.conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = conversations.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create conversations in their projects."
    ON public.conversations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = conversations.project_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can view messages in their project conversations."
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.research_projects rp ON rp.id = c.project_id
            WHERE c.id = messages.conversation_id AND rp.owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in their project conversations."
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.research_projects rp ON rp.id = c.project_id
            WHERE c.id = messages.conversation_id AND rp.owner_id = auth.uid()
        )
    );

-- 15. RLS Policies for schedule_events
CREATE POLICY "Users can view schedule events."
    ON public.schedule_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create schedule events."
    ON public.schedule_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update schedule events."
    ON public.schedule_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete schedule events."
    ON public.schedule_events FOR DELETE
    USING (auth.uid() = user_id);
