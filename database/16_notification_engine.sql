-- Migration 16: Notification System Reconciliation & Foreign Key References
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Upgrade public.user_notifications table with full relational pointers & sender fields
ALTER TABLE public.user_notifications
    ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.collaboration_channels(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.user_messages(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS research_project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS file_id UUID REFERENCES public.files(id) ON DELETE CASCADE;

-- 2. Create PostgreSQL Function & Trigger for Automatic Transactional NEW_MESSAGE Notification Dispatch
CREATE OR REPLACE FUNCTION public.handle_new_user_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    member_record RECORD;
    sender_name TEXT;
    channel_title TEXT;
    pref_enabled BOOLEAN;
BEGIN
    -- Fetch sender display name
    SELECT name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
    IF sender_name IS NULL THEN
        sender_name := 'A researcher';
    END IF;

    -- Fetch channel title
    SELECT title INTO channel_title FROM public.collaboration_channels WHERE id = NEW.channel_id;

    -- Loop through all channel members EXCEPT the message sender
    FOR member_record IN 
        SELECT user_id FROM public.channel_members 
        WHERE channel_id = NEW.channel_id AND user_id <> NEW.sender_id
    LOOP
        -- Check recipient's notification preference (default true)
        SELECT COALESCE(notify_messages, true) INTO pref_enabled 
        FROM public.user_settings 
        WHERE user_id = member_record.user_id;

        IF pref_enabled IS NULL OR pref_enabled = true THEN
            INSERT INTO public.user_notifications (
                user_id,
                actor_user_id,
                type,
                title,
                message,
                conversation_id,
                message_id,
                read_at,
                created_at
            )
            VALUES (
                member_record.user_id,
                NEW.sender_id,
                'NEW_MESSAGE',
                'New message from ' || sender_name,
                COALESCE(LEFT(NEW.content, 100), 'Sent a message'),
                NEW.channel_id,
                NEW.id,
                NULL,
                now()
            );
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger to public.user_messages
DROP TRIGGER IF EXISTS on_user_message_created_notify ON public.user_messages;
CREATE TRIGGER on_user_message_created_notify
    AFTER INSERT ON public.user_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_message_notification();

-- 4. Enable Supabase Realtime for instant notification streaming to clients
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.user_notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.user_notifications(user_id, created_at DESC);

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
