-- ResearchCompany Task 10: Customizable Researcher Profile Schema Extension
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Extend public.profiles table with comprehensive researcher identity & privacy fields
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Principal Investigator',
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS institution TEXT,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS academic_level TEXT,
    ADD COLUMN IF NOT EXISTS location TEXT,
    ADD COLUMN IF NOT EXISTS website TEXT,
    ADD COLUMN IF NOT EXISTS orcid TEXT,
    ADD COLUMN IF NOT EXISTS google_scholar_url TEXT,
    ADD COLUMN IF NOT EXISTS researchgate_url TEXT,
    ADD COLUMN IF NOT EXISTS github_url TEXT,
    ADD COLUMN IF NOT EXISTS research_interests TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS research_fields TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS preferred_methods TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS profile_visibility TEXT DEFAULT 'public' CHECK (profile_visibility IN ('public', 'authenticated', 'private')),
    ADD COLUMN IF NOT EXISTS show_email BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS show_projects BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS show_achievements BOOLEAN DEFAULT true;

-- 2. Create public.research_achievements table
CREATE TABLE IF NOT EXISTS public.research_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    venue_or_issuer TEXT,
    year TEXT,
    url TEXT,
    category TEXT DEFAULT 'publication' CHECK (category IN ('publication', 'award', 'grant', 'patent')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create Storage bucket 'avatars' for profile pictures if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable RLS on storage.objects for avatars bucket
ALTER TABLE public.research_achievements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for research_achievements
DO $$
BEGIN
    DROP POLICY IF EXISTS "Achievements viewable based on profile visibility" ON public.research_achievements;
    DROP POLICY IF EXISTS "Users can manage own achievements" ON public.research_achievements;
    DROP POLICY IF EXISTS "Avatars viewable by all" ON storage.objects;
    DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
END $$;

CREATE POLICY "Achievements viewable based on profile visibility"
    ON public.research_achievements FOR SELECT
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.user_id = research_achievements.user_id
              AND (
                p.profile_visibility = 'public'
                OR (p.profile_visibility = 'authenticated' AND auth.role() = 'authenticated')
              )
        )
    );

CREATE POLICY "Users can manage own achievements"
    ON public.research_achievements FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 6. RLS Storage Policies for avatars bucket
CREATE POLICY "Avatars viewable by all"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatars' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
    );

-- 7. Performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON public.research_achievements(user_id);

-- 8. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
