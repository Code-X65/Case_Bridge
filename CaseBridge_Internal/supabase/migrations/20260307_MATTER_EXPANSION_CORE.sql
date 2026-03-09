-- ==========================================
-- MATTER RESEARCH & NOTES HUB
-- ==========================================

-- 1. Create Research Notes Table
CREATE TABLE IF NOT EXISTS public.matter_research_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    category TEXT NOT NULL CHECK (category IN ('legal_research', 'case_strategy', 'meeting_notes', 'internal_memo')),
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- Rich text content
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add Checklist support to tasks
ALTER TABLE public.matter_tasks 
ADD COLUMN IF NOT EXISTS checklist_items JSONB DEFAULT '[]'::jsonb;

-- 3. Add Status for Progress Reports (Matter Updates)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matter_updates' AND column_name='status') THEN
        ALTER TABLE public.matter_updates ADD COLUMN status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'under_review', 'published'));
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.matter_research_notes ENABLE ROW LEVEL SECURITY;

-- Policies for Research Notes
CREATE POLICY "Users can view research notes for their firm's matters"
    ON public.matter_research_notes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.matters m
            WHERE m.id = matter_research_notes.matter_id
            AND m.firm_id IN (
                SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can manage research notes for their firm's matters"
    ON public.matter_research_notes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.matters m
            WHERE m.id = matter_research_notes.matter_id
            AND m.firm_id IN (
                SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid()
            )
        )
    );

SELECT '✅ Matter Workspace expansion schema initialized' AS status;
