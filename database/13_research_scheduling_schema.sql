-- ResearchCompany Task 11: Scheduling & Research Project Management Schema
-- Run this script in your Supabase SQL Editor (https://supabase.com/dashboard/project/tnnkmbuqvknamrbwakpl/sql)

-- 1. Create public.research_milestones table
CREATE TABLE IF NOT EXISTS public.research_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    target_date TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create public.research_tasks table with status, priority & assignments
CREATE TABLE IF NOT EXISTS public.research_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.research_projects(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.research_milestones(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED')),
    priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    start_at TIMESTAMPTZ,
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create public.research_reminders table
CREATE TABLE IF NOT EXISTS public.research_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    task_id UUID REFERENCES public.research_tasks(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.research_milestones(id) ON DELETE CASCADE,
    reminder_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create public.user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'task_assigned',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    task_id UUID REFERENCES public.research_tasks(id) ON DELETE CASCADE,
    milestone_id UUID REFERENCES public.research_milestones(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable Row Level Security (RLS) on all scheduling tables
ALTER TABLE public.research_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- 6. Drop policies if exists
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view milestones for accessible projects" ON public.research_milestones;
    DROP POLICY IF EXISTS "Users can manage milestones for accessible projects" ON public.research_milestones;
    DROP POLICY IF EXISTS "Users can view tasks for accessible projects or assignments" ON public.research_tasks;
    DROP POLICY IF EXISTS "Users can manage tasks for accessible projects" ON public.research_tasks;
    DROP POLICY IF EXISTS "Users can view own reminders" ON public.research_reminders;
    DROP POLICY IF EXISTS "Users can manage own reminders" ON public.research_reminders;
    DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
    DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
END $$;

-- 7. RLS Policies for research_milestones
CREATE POLICY "Users can view milestones for accessible projects"
    ON public.research_milestones FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = research_milestones.project_id AND rp.owner_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can manage milestones for accessible projects"
    ON public.research_milestones FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = research_milestones.project_id AND rp.owner_id = auth.uid()
        )
        OR created_by = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = research_milestones.project_id AND rp.owner_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- 8. RLS Policies for research_tasks
CREATE POLICY "Users can view tasks for accessible projects or assignments"
    ON public.research_tasks FOR SELECT
    USING (
        auth.uid() = created_by
        OR auth.uid() = assigned_to
        OR (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = research_tasks.project_id AND rp.owner_id = auth.uid()
        ))
    );

CREATE POLICY "Users can manage tasks for accessible projects"
    ON public.research_tasks FOR ALL
    USING (
        auth.uid() = created_by
        OR auth.uid() = assigned_to
        OR (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = research_tasks.project_id AND rp.owner_id = auth.uid()
        ))
    )
    WITH CHECK (
        auth.uid() = created_by
        OR (project_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.research_projects rp
            WHERE rp.id = research_tasks.project_id AND rp.owner_id = auth.uid()
        ))
    );

-- 9. RLS Policies for reminders & notifications
CREATE POLICY "Users can view own reminders"
    ON public.research_reminders FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own reminders"
    ON public.research_reminders FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own notifications"
    ON public.user_notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.user_notifications FOR UPDATE
    USING (auth.uid() = user_id);

-- 10. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON public.research_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON public.research_milestones(target_date);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.research_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.research_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON public.research_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.research_tasks(status);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON public.research_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.user_notifications(user_id);

-- 11. Reload schema cache
NOTIFY pgrst, 'reload schema';
