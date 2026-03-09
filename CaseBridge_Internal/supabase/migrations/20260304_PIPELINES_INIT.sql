-- ==========================================
-- PHASE 3: STRUCTURED CASE PIPELINES
-- ==========================================

-- 1. Practice Pipelines (E.g. Personal Injury, Family Law)
CREATE TABLE IF NOT EXISTS public.practice_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Pipeline Stages (E.g. Intake, Discovery, Trial)
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID REFERENCES public.practice_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    is_gate_active BOOLEAN DEFAULT TRUE, -- If TRUE, requires checklist completion
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Stage Gate Checklists
CREATE TABLE IF NOT EXISTS public.stage_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matter Stage Progress
-- Tracks completion of gate items for specific matters
CREATE TABLE IF NOT EXISTS public.matter_stage_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    checklist_item_id UUID REFERENCES public.stage_checklists(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_by UUID REFERENCES public.profiles(id),
    completed_at TIMESTAMPTZ,
    UNIQUE(matter_id, checklist_item_id)
);

-- 5. Link Matters to Pipelines
ALTER TABLE public.matters 
ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES public.practice_pipelines(id),
ADD COLUMN IF NOT EXISTS current_pipeline_stage_id UUID REFERENCES public.pipeline_stages(id);

-- 6. RLS Policies
ALTER TABLE public.practice_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_stage_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_access_pipelines" ON public.practice_pipelines;
CREATE POLICY "firm_access_pipelines" ON public.practice_pipelines
FOR ALL TO authenticated USING (
    firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
);

DROP POLICY IF EXISTS "firm_access_stages" ON public.pipeline_stages;
CREATE POLICY "firm_access_stages" ON public.pipeline_stages
FOR ALL TO authenticated USING (
    pipeline_id IN (
        SELECT id FROM public.practice_pipelines 
        WHERE firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
    )
);

DROP POLICY IF EXISTS "firm_access_checklists" ON public.stage_checklists;
CREATE POLICY "firm_access_checklists" ON public.stage_checklists
FOR ALL TO authenticated USING (
    stage_id IN (
        SELECT id FROM public.pipeline_stages 
        WHERE pipeline_id IN (
            SELECT id FROM public.practice_pipelines 
            WHERE firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
        )
    )
);

DROP POLICY IF EXISTS "firm_access_stage_progress" ON public.matter_stage_progress;
CREATE POLICY "firm_access_stage_progress" ON public.matter_stage_progress
FOR ALL TO authenticated USING (
    matter_id IN (
        SELECT id FROM public.matters 
        WHERE firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
    )
);

SELECT '✅ Case Pipelines and Stage-Gate Schema Initialized.' AS status;
