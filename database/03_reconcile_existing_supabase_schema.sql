-- ResearchCompany Migration Task 04C: Reconciliation Script for Existing Supabase Database
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- -----------------------------------------------------------------------------
-- STEP 1: Reusable updated_at timestamp trigger function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- STEP 2: Ensure public.profiles table exists
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'Researcher',
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Safely add any missing profile columns if profiles already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Researcher';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies (Idempotent: Drop first if exists)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public profiles are viewable by authenticated users." ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
END $$;

CREATE POLICY "Public profiles are viewable by authenticated users." 
    ON public.profiles FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile." 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Profile automatic timestamp trigger
DROP TRIGGER IF EXISTS on_profile_updated ON public.profiles;
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Profile automatic creation trigger on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, name, avatar_url, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.email
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- STEP 3: Safely reconcile research_projects table (drop identity if present)
-- -----------------------------------------------------------------------------

-- If research_projects exists with integer identity/bigint 'id', drop identity & alter 'id' to UUID
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'research_projects' 
          AND column_name = 'id' 
          AND data_type IN ('bigint', 'integer')
    ) THEN
        -- Drop identity property if present
        ALTER TABLE public.research_projects ALTER COLUMN id DROP IDENTITY IF EXISTS;
        -- Alter id column type to UUID
        ALTER TABLE public.research_projects 
            ALTER COLUMN id SET DATA TYPE UUID USING gen_random_uuid(),
            ALTER COLUMN id SET DEFAULT gen_random_uuid();
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.research_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safely add missing columns to research_projects if table already existed without them
ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure status check constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'research_projects_status_check'
    ) THEN
        ALTER TABLE public.research_projects 
            ADD CONSTRAINT research_projects_status_check 
            CHECK (status IN ('active', 'archived', 'completed'));
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Index on owner_id
CREATE INDEX IF NOT EXISTS idx_research_projects_owner_id ON public.research_projects(owner_id);

-- Research projects timestamp trigger
DROP TRIGGER IF EXISTS on_research_project_updated ON public.research_projects;
CREATE TRIGGER on_research_project_updated
    BEFORE UPDATE ON public.research_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS on research_projects
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;

-- Research projects RLS policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own projects." ON public.research_projects;
    DROP POLICY IF EXISTS "Users can create their own projects." ON public.research_projects;
    DROP POLICY IF EXISTS "Users can update their own projects." ON public.research_projects;
    DROP POLICY IF EXISTS "Users can delete their own projects." ON public.research_projects;
END $$;

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

-- -----------------------------------------------------------------------------
-- STEP 4: Create remaining relational tables (folders, files, citations, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    parent_folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view folders in their projects." ON public.folders;
    DROP POLICY IF EXISTS "Users can insert folders in their projects." ON public.folders;
    DROP POLICY IF EXISTS "Users can update folders in their projects." ON public.folders;
    DROP POLICY IF EXISTS "Users can delete folders in their projects." ON public.folders;
END $$;

CREATE POLICY "Users can view folders in their projects."
    ON public.folders FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can insert folders in their projects."
    ON public.folders FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can update folders in their projects."
    ON public.folders FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can delete folders in their projects."
    ON public.folders FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = folders.project_id AND rp.owner_id = auth.uid()));

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

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view files in their projects." ON public.files;
    DROP POLICY IF EXISTS "Users can insert files in their projects." ON public.files;
    DROP POLICY IF EXISTS "Users can update files in their projects." ON public.files;
    DROP POLICY IF EXISTS "Users can delete files in their projects." ON public.files;
END $$;

CREATE POLICY "Users can view files in their projects."
    ON public.files FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can insert files in their projects."
    ON public.files FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can update files in their projects."
    ON public.files FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can delete files in their projects."
    ON public.files FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = files.project_id AND rp.owner_id = auth.uid()));

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

ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view citations in their projects." ON public.citations;
    DROP POLICY IF EXISTS "Users can insert citations in their projects." ON public.citations;
    DROP POLICY IF EXISTS "Users can update citations in their projects." ON public.citations;
    DROP POLICY IF EXISTS "Users can delete citations in their projects." ON public.citations;
END $$;

CREATE POLICY "Users can view citations in their projects."
    ON public.citations FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can insert citations in their projects."
    ON public.citations FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can update citations in their projects."
    ON public.citations FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can delete citations in their projects."
    ON public.citations FOR DELETE
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = citations.project_id AND rp.owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view conversations in their projects." ON public.conversations;
    DROP POLICY IF EXISTS "Users can create conversations in their projects." ON public.conversations;
END $$;

CREATE POLICY "Users can view conversations in their projects."
    ON public.conversations FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = conversations.project_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can create conversations in their projects."
    ON public.conversations FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.research_projects rp WHERE rp.id = conversations.project_id AND rp.owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'ai')),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view messages in their project conversations." ON public.messages;
    DROP POLICY IF EXISTS "Users can insert messages in their project conversations." ON public.messages;
END $$;

CREATE POLICY "Users can view messages in their project conversations."
    ON public.messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.conversations c JOIN public.research_projects rp ON rp.id = c.project_id WHERE c.id = messages.conversation_id AND rp.owner_id = auth.uid()));

CREATE POLICY "Users can insert messages in their project conversations."
    ON public.messages FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.conversations c JOIN public.research_projects rp ON rp.id = c.project_id WHERE c.id = messages.conversation_id AND rp.owner_id = auth.uid()));

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

ALTER TABLE public.schedule_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view schedule events." ON public.schedule_events;
    DROP POLICY IF EXISTS "Users can create schedule events." ON public.schedule_events;
    DROP POLICY IF EXISTS "Users can update schedule events." ON public.schedule_events;
    DROP POLICY IF EXISTS "Users can delete schedule events." ON public.schedule_events;
END $$;

CREATE POLICY "Users can view schedule events." ON public.schedule_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create schedule events." ON public.schedule_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update schedule events." ON public.schedule_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete schedule events." ON public.schedule_events FOR DELETE USING (auth.uid() = user_id);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
