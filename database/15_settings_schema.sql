-- ResearchCompany Task 13: Settings & Configuration System Schema Migration
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Create public.user_settings table for user-level preferences
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- General Workspace Preferences
    default_project_visibility TEXT DEFAULT 'private' CHECK (default_project_visibility IN ('public', 'private', 'team')),
    default_task_priority TEXT DEFAULT 'MEDIUM' CHECK (default_task_priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    default_task_status TEXT DEFAULT 'TODO' CHECK (default_task_status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
    default_citation_format TEXT DEFAULT 'APA' CHECK (default_citation_format IN ('APA', 'MLA', 'IEEE', 'Chicago')),
    timezone TEXT DEFAULT 'UTC',
    timeline_view TEXT DEFAULT 'MONTH' CHECK (timeline_view IN ('DAY', 'WEEK', 'MONTH')),

    -- AI Assistant & Retrieval Parameters
    ai_provider TEXT DEFAULT 'auto' CHECK (ai_provider IN ('auto', 'openrouter', 'openai')),
    ai_model TEXT DEFAULT 'gpt-4o-mini',
    ai_temperature NUMERIC DEFAULT 0.7 CHECK (ai_temperature >= 0 AND ai_temperature <= 2),
    retrieval_enabled BOOLEAN DEFAULT true,
    top_k INT DEFAULT 8 CHECK (top_k >= 1 AND top_k <= 50),
    similarity_threshold NUMERIC DEFAULT 0.70 CHECK (similarity_threshold >= 0 AND similarity_threshold <= 1),
    response_style TEXT DEFAULT 'balanced' CHECK (response_style IN ('concise', 'balanced', 'detailed')),
    include_citations_by_default BOOLEAN DEFAULT true,
    prefer_project_context BOOLEAN DEFAULT true,

    -- Notifications & Quiet Hours
    notify_messages BOOLEAN DEFAULT true,
    notify_task_assignments BOOLEAN DEFAULT true,
    notify_deadlines BOOLEAN DEFAULT true,
    notify_milestones BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if any
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
    DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
END $$;

-- 4. Create RLS Policies
CREATE POLICY "Users can view own settings"
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_settings_updated ON public.user_settings;
CREATE TRIGGER on_user_settings_updated
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_settings_updated_at();

-- 7. Reload schema cache
NOTIFY pgrst, 'reload schema';
