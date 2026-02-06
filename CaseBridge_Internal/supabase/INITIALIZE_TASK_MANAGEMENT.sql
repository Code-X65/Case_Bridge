-- ==========================================
-- PHASE 3: ADVANCED TASK & WORKFLOW MANAGEMENT
-- Implementation of Matter Tasks, Templates, and Collaboration
-- ==========================================

-- 1. Create task status enum-like table or check constraint
-- We will use a TEXT field with CHECK constraint for flexibility in this env
CREATE TABLE IF NOT EXISTS public.matter_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.case_stages(id) ON DELETE SET NULL,
    assigned_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_id UUID REFERENCES auth.users(id),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'under_review', 'completed', 'blocked')),
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_client_visible BOOLEAN DEFAULT FALSE,
    required_for_stage_completion BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create task_templates table
-- These are blueprints that can be automatically applied to new cases
CREATE TABLE IF NOT EXISTS public.task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.case_pipelines(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.case_stages(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    default_priority TEXT DEFAULT 'medium',
    is_client_visible_by_default BOOLEAN DEFAULT FALSE,
    required_by_default BOOLEAN DEFAULT FALSE,
    suggested_days_to_complete INTEGER, -- Days from stage entry
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.matter_tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id),
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.matter_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "staff_all_tasks" ON public.matter_tasks;
DROP POLICY IF EXISTS "staff_all_templates" ON public.task_templates;
DROP POLICY IF EXISTS "staff_all_task_comments" ON public.task_comments;
DROP POLICY IF EXISTS "client_view_assigned_tasks" ON public.matter_tasks;
DROP POLICY IF EXISTS "client_view_task_comments" ON public.task_comments;

-- Staff: Full Access
CREATE POLICY "staff_all_tasks" ON public.matter_tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_templates" ON public.task_templates FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_task_comments" ON public.task_comments FOR ALL TO authenticated USING (true);

-- Client: View only tasks marked as client visible for their matters
CREATE POLICY "client_view_assigned_tasks" ON public.matter_tasks FOR SELECT TO authenticated 
USING (
    is_client_visible = true AND 
    EXISTS (SELECT 1 FROM public.matters WHERE id = public.matter_tasks.matter_id AND client_id = auth.uid())
);

-- Client: View only non-internal comments for visible tasks
CREATE POLICY "client_view_task_comments" ON public.task_comments FOR SELECT TO authenticated 
USING (
    is_internal = false AND 
    EXISTS (
        SELECT 1 FROM public.matter_tasks mt
        JOIN public.matters m ON m.id = mt.matter_id
        WHERE mt.id = public.task_comments.task_id 
        AND mt.is_client_visible = true 
        AND m.client_id = auth.uid()
    )
);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_matter_tasks_updated_at
    BEFORE UPDATE ON public.matter_tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 7. Seed Data: Task Templates for Criminal Defense Pipeline
DO $$
DECLARE
    v_pipeline_id UUID;
    v_stage_1 UUID;
    v_stage_2 UUID;
    v_stage_3 UUID;
BEGIN
    SELECT id INTO v_pipeline_id FROM public.case_pipelines WHERE name = 'Criminal Defense Standard' LIMIT 1;
    
    -- Stage 1: Intake Tasks
    SELECT id INTO v_stage_1 FROM public.case_stages WHERE pipeline_id = v_pipeline_id AND order_index = 1 LIMIT 1;
    INSERT INTO public.task_templates (pipeline_id, stage_id, title, description, default_priority, is_client_visible_by_default, required_by_default) VALUES
    (v_pipeline_id, v_stage_1, 'Sign Retainer Agreement', 'Client must sign the formal representation agreement.', 'high', true, true),
    (v_pipeline_id, v_stage_1, 'Initial Conflict Check', 'Verify no conflicts of interest exist with the case.', 'urgent', false, true),
    (v_pipeline_id, v_stage_1, 'Open Internal File', 'Assign matter number and set up digital folder.', 'medium', false, true);

    -- Stage 2: Evidence Gathering Tasks
    SELECT id INTO v_stage_2 FROM public.case_stages WHERE pipeline_id = v_pipeline_id AND order_index = 2 LIMIT 1;
    INSERT INTO public.task_templates (pipeline_id, stage_id, title, description, default_priority, is_client_visible_by_default, required_by_default) VALUES
    (v_pipeline_id, v_stage_2, 'Request Discovery Packet', 'File formal request with prosecutor for all evidence.', 'high', false, true),
    (v_pipeline_id, v_stage_2, 'Collect Client Statement', 'Conduct detailed interview with client regarding the incident.', 'medium', true, false),
    (v_pipeline_id, v_stage_2, 'Subpoena Bodycam Footage', 'Obtain all relevant police bodycam and dashcam recordings.', 'high', false, true);

    -- Stage 3: Pleading & Motions
    SELECT id INTO v_stage_3 FROM public.case_stages WHERE pipeline_id = v_pipeline_id AND order_index = 3 LIMIT 1;
    INSERT INTO public.task_templates (pipeline_id, stage_id, title, description, default_priority, is_client_visible_by_default, required_by_default) VALUES
    (v_pipeline_id, v_stage_3, 'File Motion to Suppress', 'Research and draft motion to exclude illegally obtained evidence.', 'urgent', false, false),
    (v_pipeline_id, v_stage_3, 'Evaluate Plea Offer', 'Review prosecutor proposed plea and advise client.', 'high', true, true);
END $$;

-- 8. Verification
SELECT '✅ TASK MANAGEMENT SYSTEM INITIALIZED' as status, (SELECT COUNT(*) FROM public.task_templates) as total_templates;
