-- ResearchCompany Task 07: Conversations & Messages Schema Reconciliation Script
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Make project_id optional in public.conversations for global AI assistant chats
ALTER TABLE public.conversations ALTER COLUMN project_id DROP NOT NULL;

-- 2. Ensure RLS is enabled on conversations & messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing strict policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view conversations in their projects." ON public.conversations;
    DROP POLICY IF EXISTS "Users can create conversations in their projects." ON public.conversations;
    DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
    DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;
    
    DROP POLICY IF EXISTS "Users can view messages in their project conversations." ON public.messages;
    DROP POLICY IF EXISTS "Users can insert messages in their project conversations." ON public.messages;
    DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
    DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
END $$;

-- 4. User Ownership RLS Policies for conversations
CREATE POLICY "Users can view their own conversations"
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
    ON public.conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
    ON public.conversations FOR DELETE
    USING (auth.uid() = user_id);

-- 5. User Ownership RLS Policies for messages
CREATE POLICY "Users can view their own messages"
    ON public.messages FOR SELECT
    USING (auth.uid() = sender_id OR EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert their own messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id OR EXISTS (
        SELECT 1 FROM public.conversations c 
        WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    ));

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
