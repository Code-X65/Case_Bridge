-- ==========================================
-- TASK MANAGEMENT SYSTEM
-- ==========================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    END IF;
END $$;

-- Create Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE, -- Optional: links task to a case
    assigned_to UUID REFERENCES public.profiles(id) NOT NULL,
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status public.task_status DEFAULT 'pending',
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 1. View Tasks: Firm Scoped + Role Scoped
-- Admin & Case Manager can see all firm tasks
-- Associate can only see tasks assigned to them OR tasks in matters they are assigned to
CREATE POLICY "Tasks view policy" 
ON public.tasks
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = tasks.firm_id 
        AND status = 'active'
        AND (
            role IN ('admin_manager', 'case_manager')
            OR (role = 'associate_lawyer' AND (tasks.assigned_to = auth.uid() OR EXISTS (
                SELECT 1 FROM public.matters 
                WHERE id = tasks.matter_id AND assigned_associate = auth.uid()
            )))
        )
    )
);

-- 2. Create Tasks: Role Scoped
-- Case Managers can create for anyone in firm
-- Associates can only create for themselves
CREATE POLICY "Tasks insert policy" 
ON public.tasks
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = tasks.firm_id 
        AND status = 'active'
        AND (
            role IN ('admin_manager', 'case_manager')
            OR (role = 'associate_lawyer' AND assigned_to = auth.uid())
        )
    )
);

-- 3. Update Tasks: Role Scoped
-- Can update status if assigned
-- CM/Admin can update anything
CREATE POLICY "Tasks update policy" 
ON public.tasks
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = tasks.firm_id 
        AND status = 'active'
        AND (
            role IN ('admin_manager', 'case_manager')
            OR (role = 'associate_lawyer' AND assigned_to = auth.uid())
        )
    )
);

-- 4. Delete Tasks: Admin/CM only
CREATE POLICY "Tasks delete policy" 
ON public.tasks
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = tasks.firm_id 
        AND status = 'active'
        AND role IN ('admin_manager', 'case_manager')
    )
);

-- Audit Logging for Tasks
CREATE OR REPLACE FUNCTION public.audit_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
         INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
         VALUES (auth.uid(), NEW.firm_id, 'task_created', NEW.id, jsonb_build_object('title', NEW.title));
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.status IS DISTINCT FROM OLD.status) THEN
            INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
            VALUES (auth.uid(), NEW.firm_id, 'task_status_updated', NEW.id, jsonb_build_object('new_status', NEW.status, 'old_status', OLD.status));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER task_audit_trigger
AFTER INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.audit_task_changes();

SELECT '✅ Task Management Schema Applied Successfully.' AS status;
