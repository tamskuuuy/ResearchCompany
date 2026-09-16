-- ResearchCompany Task 09: User-to-User Collaboration & Messaging Schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Create public.collaboration_channels table for user-to-user DMs and project discussion rooms
CREATE TABLE IF NOT EXISTS public.collaboration_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'dm' CHECK (type IN ('dm', 'project_group')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create public.channel_members table to track channel participants & unread states
CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.collaboration_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT now(),
    last_read_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_channel_user UNIQUE (channel_id, user_id)
);

-- 3. Create public.user_messages table for direct messaging between researchers
CREATE TABLE IF NOT EXISTS public.user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES public.collaboration_channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable Row Level Security (RLS) on all messaging tables
ALTER TABLE public.collaboration_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies to prevent conflicts
DO $$
BEGIN
    DROP POLICY IF EXISTS "Members can view collaboration channels" ON public.collaboration_channels;
    DROP POLICY IF EXISTS "Users can create collaboration channels" ON public.collaboration_channels;
    DROP POLICY IF EXISTS "Members can view channel members" ON public.channel_members;
    DROP POLICY IF EXISTS "Users can join or add members" ON public.channel_members;
    DROP POLICY IF EXISTS "Members can update their membership" ON public.channel_members;
    DROP POLICY IF EXISTS "Members can view user messages" ON public.user_messages;
    DROP POLICY IF EXISTS "Members can send user messages" ON public.user_messages;
END $$;

-- 6. RLS Policies for collaboration_channels
CREATE POLICY "Members can view collaboration channels"
    ON public.collaboration_channels FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = collaboration_channels.id AND cm.user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can create collaboration channels"
    ON public.collaboration_channels FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- 7. RLS Policies for channel_members
CREATE POLICY "Members can view channel members"
    ON public.channel_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = channel_members.channel_id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can join or add members"
    ON public.channel_members FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1 FROM public.collaboration_channels cc
            WHERE cc.id = channel_members.channel_id AND cc.created_by = auth.uid()
        )
    );

CREATE POLICY "Members can update their membership"
    ON public.channel_members FOR UPDATE
    USING (auth.uid() = user_id);

-- 8. RLS Policies for user_messages
CREATE POLICY "Members can view user messages"
    ON public.user_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = user_messages.channel_id AND cm.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can send user messages"
    ON public.user_messages FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id
        AND EXISTS (
            SELECT 1 FROM public.channel_members cm
            WHERE cm.channel_id = user_messages.channel_id AND cm.user_id = auth.uid()
        )
    );

-- 9. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_channel_id ON public.user_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_created_at ON public.user_messages(created_at);

-- 10. Enable Supabase Realtime for instant user-to-user messaging
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_messages;

-- 11. Reload schema cache
NOTIFY pgrst, 'reload schema';
