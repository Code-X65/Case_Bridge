-- ==========================================
-- PHASE 2: STRUCTURED CASE LIFECYCLE MANAGEMENT
-- Implementation of Case Pipelines, Stages, and Tracking
-- ==========================================

-- 1. Create case_pipelines table
CREATE TABLE IF NOT EXISTS public.case_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    practice_area TEXT, -- e.g., 'Criminal', 'Civil', 'Corporate'
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create case_stages table
CREATE TABLE IF NOT EXISTS public.case_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.case_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER NOT NULL,
    color_code TEXT DEFAULT '#6366f1', -- Indigo default
    icon_name TEXT DEFAULT 'FileText',
    required_assets_config JSONB DEFAULT '[]'::jsonb, -- e.g., [{"type": "document", "name": "Retainer Agreement"}]
    estimated_duration_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create matter_stage_history table (for analytics and timeline)
CREATE TABLE IF NOT EXISTS public.matter_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.case_stages(id) ON DELETE SET NULL,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    exited_at TIMESTAMPTZ,
    changed_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- 4. Enhance matters table with pipeline tracking
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'pipeline_id') THEN
        ALTER TABLE public.matters ADD COLUMN pipeline_id UUID REFERENCES public.case_pipelines(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'current_stage_id') THEN
        ALTER TABLE public.matters ADD COLUMN current_stage_id UUID REFERENCES public.case_stages(id);
    END IF;
END $$;

-- 5. Enable RLS
ALTER TABLE public.case_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_stage_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DROP POLICY IF EXISTS "staff_all_pipelines" ON public.case_pipelines;
DROP POLICY IF EXISTS "staff_all_stages" ON public.case_stages;
DROP POLICY IF EXISTS "staff_all_history" ON public.matter_stage_history;
DROP POLICY IF EXISTS "client_view_assigned_pipeline" ON public.case_pipelines;
DROP POLICY IF EXISTS "client_view_assigned_stages" ON public.case_stages;
DROP POLICY IF EXISTS "client_view_own_history" ON public.matter_stage_history;

-- Staff Policy (All access)
CREATE POLICY "staff_all_pipelines" ON public.case_pipelines FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_stages" ON public.case_stages FOR ALL TO authenticated USING (true);
CREATE POLICY "staff_all_history" ON public.matter_stage_history FOR ALL TO authenticated USING (true);

-- Client Policy (View only if linked to their matter)
CREATE POLICY "client_view_assigned_pipeline" ON public.case_pipelines FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.matters WHERE pipeline_id = public.case_pipelines.id AND client_id = auth.uid()));

CREATE POLICY "client_view_assigned_stages" ON public.case_stages FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.matters WHERE pipeline_id = public.case_stages.pipeline_id AND client_id = auth.uid()));

CREATE POLICY "client_view_own_history" ON public.matter_stage_history FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.matters WHERE id = public.matter_stage_history.matter_id AND client_id = auth.uid()));

-- 7. Seed Data: Default Criminal Pipeline
DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    -- Create Pipeline
    INSERT INTO public.case_pipelines (name, description, practice_area, is_default)
    VALUES ('Criminal Defense Standard', 'Standard workflow for criminal cases from intake to resolution.', 'Criminal', TRUE)
    RETURNING id INTO v_pipeline_id;

    -- Create Stages
    INSERT INTO public.case_stages (pipeline_id, name, order_index, color_code, icon_name, description) VALUES
    (v_pipeline_id, 'Intake & Arraignment', 1, '#10b981', 'UserCheck', 'Initial case intake and first court appearance.'),
    (v_pipeline_id, 'Evidence Gathering', 2, '#3b82f6', 'Search', 'Collection of discovery, witness statements, and bodycam footage.'),
    (v_pipeline_id, 'Pleading & Motions', 3, '#6366f1', 'Gavel', 'Filing of pre-trial motions and negotiating pleas.'),
    (v_pipeline_id, 'Discovery & Prep', 4, '#8b5cf6', 'ClipboardList', 'Review of prosecution evidence and trial preparation.'),
    (v_pipeline_id, 'Trial & Resolution', 5, '#f59e0b', 'Scale', 'Formal trial proceedings and final judgment.');
END $$;

-- 8. Seed Data: Default Civil Litigation Pipeline
DO $$
DECLARE
    v_pipeline_id UUID;
BEGIN
    INSERT INTO public.case_pipelines (name, description, practice_area, is_default)
    VALUES ('Civil Litigation Standard', 'Standard workflow for civil lawsuits and contract disputes.', 'Civil', TRUE)
    RETURNING id INTO v_pipeline_id;

    INSERT INTO public.case_stages (pipeline_id, name, order_index, color_code, icon_name, description) VALUES
    (v_pipeline_id, 'Pre-Litigation', 1, '#10b981', 'FilePlus', 'Demand letters and initial negotiation.'),
    (v_pipeline_id, 'Pleading Phase', 2, '#3b82f6', 'Edit3', 'Filing complaint, service of process, and answer.'),
    (v_pipeline_id, 'Discovery', 3, '#6366f1', 'Users', 'Interrogatories, depositions, and document requests.'),
    (v_pipeline_id, 'Mediation/Settlement', 4, '#8b5cf6', 'Handshake', 'Alternative dispute resolution and settlement talks.'),
    (v_pipeline_id, 'Trial & Judgment', 5, '#f59e0b', 'Award', 'Final court proceedings and enforcement of judgment.');
END $$;

-- 9. Verification
SELECT 
    '✅ CASE LIFECYCLE SYSTEM INITIALIZED' as status,
    (SELECT COUNT(*) FROM public.case_pipelines) as total_pipelines,
    (SELECT COUNT(*) FROM public.case_stages) as total_stages;
