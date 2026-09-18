-- ============================================================
-- RESEARCH COMPANY
-- FULL COLLABORATION & MESSAGING SCHEMA
-- ============================================================
--
-- Features:
--   - Direct Messages (DM)
--   - Project Discussion Groups
--   - Channel Members
--   - User Messages
--   - Row Level Security
--   - Anti-RLS-recursion helper functions
--   - Performance indexes
--   - updated_at trigger
--   - Supabase Realtime
--
-- IMPORTANT:
-- This script is designed to replace the OLD messaging policies.
-- It does NOT DROP existing tables or existing messaging data.
-- ============================================================


-- ============================================================
-- 0. EXTENSIONS / UUID
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. COLLABORATION CHANNELS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.collaboration_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    project_id UUID
        REFERENCES public.research_projects(id)
        ON DELETE CASCADE,

    created_by UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    title TEXT NOT NULL,

    type TEXT NOT NULL DEFAULT 'dm'
        CHECK (type IN ('dm', 'project_group')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. CHANNEL MEMBERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    channel_id UUID NOT NULL
        REFERENCES public.collaboration_channels(id)
        ON DELETE CASCADE,

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_channel_user
        UNIQUE (channel_id, user_id)
);


-- ============================================================
-- 3. USER MESSAGES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    channel_id UUID NOT NULL
        REFERENCES public.collaboration_channels(id)
        ON DELETE CASCADE,

    sender_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- 4. ENABLE RLS
-- ============================================================

ALTER TABLE public.collaboration_channels
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.channel_members
ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_messages
ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 5. PRIVATE SCHEMA FOR SECURITY DEFINER FUNCTIONS
-- ============================================================

CREATE SCHEMA IF NOT EXISTS private;


-- ============================================================
-- 6. SECURITY DEFINER FUNCTION:
--    CHECK CHANNEL MEMBERSHIP
--
-- IMPORTANT:
-- This prevents:
--
-- channel_members policy
--       ↓
-- SELECT channel_members
--       ↓
-- channel_members policy
--       ↓
-- INFINITE RECURSION
--
-- ============================================================

CREATE OR REPLACE FUNCTION private.is_channel_member(
    p_channel_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.channel_members
        WHERE channel_id = p_channel_id
          AND user_id = (SELECT auth.uid())
    );
$$;


-- ============================================================
-- 7. SECURITY DEFINER FUNCTION:
--    CHECK CHANNEL CREATOR
-- ============================================================

CREATE OR REPLACE FUNCTION private.is_channel_creator(
    p_channel_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.collaboration_channels
        WHERE id = p_channel_id
          AND created_by = (SELECT auth.uid())
    );
$$;


-- ============================================================
-- 8. FUNCTION PERMISSIONS
-- ============================================================

REVOKE ALL
ON FUNCTION private.is_channel_member(UUID)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION private.is_channel_creator(UUID)
FROM PUBLIC;


GRANT USAGE
ON SCHEMA private
TO authenticated;


GRANT EXECUTE
ON FUNCTION private.is_channel_member(UUID)
TO authenticated;


GRANT EXECUTE
ON FUNCTION private.is_channel_creator(UUID)
TO authenticated;


-- ============================================================
-- 9. REMOVE OLD POLICIES
-- ============================================================

DROP POLICY IF EXISTS
    "Members can view collaboration channels"
ON public.collaboration_channels;

DROP POLICY IF EXISTS
    "Users can create collaboration channels"
ON public.collaboration_channels;


DROP POLICY IF EXISTS
    "Members can view channel members"
ON public.channel_members;

DROP POLICY IF EXISTS
    "Users can join or add members"
ON public.channel_members;

DROP POLICY IF EXISTS
    "Members can update their membership"
ON public.channel_members;


DROP POLICY IF EXISTS
    "Members can view user messages"
ON public.user_messages;

DROP POLICY IF EXISTS
    "Members can send user messages"
ON public.user_messages;


-- ============================================================
-- 10. COLLABORATION CHANNEL POLICIES
-- ============================================================

-- Members can see channels they belong to.
-- Channel creators can also see channels they created.

CREATE POLICY "Members can view collaboration channels"
ON public.collaboration_channels
FOR SELECT
TO authenticated
USING (
    created_by = (SELECT auth.uid())
    OR
    (SELECT private.is_channel_member(id))
);


-- Authenticated users can create channels
-- only when they are the creator.

CREATE POLICY "Users can create collaboration channels"
ON public.collaboration_channels
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = (SELECT auth.uid())
);


-- ============================================================
-- 11. CHANNEL MEMBER POLICIES
-- ============================================================

-- Members can see all members inside channels
-- they themselves belong to.

CREATE POLICY "Members can view channel members"
ON public.channel_members
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_channel_member(channel_id))
);


-- A user may:
--
-- 1. Add themselves to a channel
-- OR
-- 2. Add another user if they created the channel.

CREATE POLICY "Users can join or add members"
ON public.channel_members
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    OR
    (SELECT private.is_channel_creator(channel_id))
);


-- Users may update their own membership data.
-- Primarily used for last_read_at.

CREATE POLICY "Members can update their membership"
ON public.channel_members
FOR UPDATE
TO authenticated
USING (
    user_id = (SELECT auth.uid())
)
WITH CHECK (
    user_id = (SELECT auth.uid())
);


-- ============================================================
-- 12. USER MESSAGE POLICIES
-- ============================================================

-- Only channel members can read messages.

CREATE POLICY "Members can view user messages"
ON public.user_messages
FOR SELECT
TO authenticated
USING (
    (SELECT private.is_channel_member(channel_id))
);


-- Users can send messages only when:
--
-- 1. sender_id belongs to the authenticated user
-- 2. user is a member of the channel

CREATE POLICY "Members can send user messages"
ON public.user_messages
FOR INSERT
TO authenticated
WITH CHECK (
    sender_id = (SELECT auth.uid())
    AND
    (SELECT private.is_channel_member(channel_id))
);


-- ============================================================
-- 13. PERFORMANCE INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
    idx_collaboration_channels_created_by
ON public.collaboration_channels(created_by);


CREATE INDEX IF NOT EXISTS
    idx_collaboration_channels_project_id
ON public.collaboration_channels(project_id);


CREATE INDEX IF NOT EXISTS
    idx_collaboration_channels_updated_at
ON public.collaboration_channels(updated_at);


CREATE INDEX IF NOT EXISTS
    idx_channel_members_user_id
ON public.channel_members(user_id);


CREATE INDEX IF NOT EXISTS
    idx_channel_members_channel_id
ON public.channel_members(channel_id);


CREATE INDEX IF NOT EXISTS
    idx_channel_members_channel_user
ON public.channel_members(channel_id, user_id);


CREATE INDEX IF NOT EXISTS
    idx_user_messages_channel_id
ON public.user_messages(channel_id);


CREATE INDEX IF NOT EXISTS
    idx_user_messages_sender_id
ON public.user_messages(sender_id);


CREATE INDEX IF NOT EXISTS
    idx_user_messages_created_at
ON public.user_messages(created_at);


CREATE INDEX IF NOT EXISTS
    idx_user_messages_channel_created
ON public.user_messages(channel_id, created_at);


-- ============================================================
-- 14. UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_messaging_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


-- ============================================================
-- 15. UPDATED_AT TRIGGERS
-- ============================================================

DROP TRIGGER IF EXISTS
    collaboration_channels_updated_at
ON public.collaboration_channels;


CREATE TRIGGER collaboration_channels_updated_at
BEFORE UPDATE ON public.collaboration_channels
FOR EACH ROW
EXECUTE FUNCTION public.update_messaging_updated_at();


DROP TRIGGER IF EXISTS
    user_messages_updated_at
ON public.user_messages;


CREATE TRIGGER user_messages_updated_at
BEFORE UPDATE ON public.user_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_messaging_updated_at();


-- ============================================================
-- 16. SUPABASE REALTIME
-- ============================================================
--
-- Add user_messages to Supabase Realtime publication
-- only if it is not already present.
--
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'user_messages'
    ) THEN

        ALTER PUBLICATION supabase_realtime
        ADD TABLE public.user_messages;

    END IF;
END
$$;


-- ============================================================
-- 17. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';


-- ============================================================
-- 18. VERIFICATION QUERIES
-- ============================================================

-- Check tables
SELECT
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'collaboration_channels',
    'channel_members',
    'user_messages'
)
ORDER BY table_name;


-- Check RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'collaboration_channels',
    'channel_members',
    'user_messages'
);


-- Check policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
    'collaboration_channels',
    'channel_members',
    'user_messages'
)
ORDER BY tablename, policyname;


-- Check Realtime
SELECT
    pubname,
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename = 'user_messages';