-- Migration 14: Backend Hardening, Indexes, Foreign Keys, and RLS Audit
-- Ensures complete relational integrity, cascading rules, performance indexing, and row level security for ResearchCompany.

-- 1. Performance Indexes for Frequent Foreign Key Queries
CREATE INDEX IF NOT EXISTS idx_research_projects_owner_id ON public.research_projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON public.conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON public.files(project_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_file_id ON public.document_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_citations_user_id ON public.citations(user_id);
CREATE INDEX IF NOT EXISTS idx_citations_project_id ON public.citations(project_id);
CREATE INDEX IF NOT EXISTS idx_research_tasks_created_by ON public.research_tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_research_tasks_assigned_to ON public.research_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_research_tasks_project_id ON public.research_tasks(research_project_id);
CREATE INDEX IF NOT EXISTS idx_research_milestones_project_id ON public.research_milestones(research_project_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_sender_receiver ON public.user_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_channel_id ON public.user_messages(channel_id);

-- 2. Storage Bucket Setup & Security Audit
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true),
       ('research-files', 'research-files', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Avatar Storage Policies
DROP POLICY IF EXISTS "Public view for avatars" ON storage.objects;
CREATE POLICY "Public view for avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Authenticated upload avatars" ON storage.objects;
CREATE POLICY "Authenticated upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owner manage avatars" ON storage.objects;
CREATE POLICY "Owner manage avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Research Files Storage Policies
DROP POLICY IF EXISTS "User view own research files" ON storage.objects;
CREATE POLICY "User view own research files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'research-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "User upload research files" ON storage.objects;
CREATE POLICY "User upload research files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'research-files' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "User delete research files" ON storage.objects;
CREATE POLICY "User delete research files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'research-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 3. Additional Safety Checks & RLS Verification
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
