-- ========================================================
-- CASE CLOSURE & LIFECYCLE REFINEMENT (PHASE 7)
-- ========================================================

-- 1. UPDATE LIFECYCLE TYPE
-- We add 'reviewing' and 'case_open' to the canonical 5-step flow.
-- Using anonymous block to handle type recreation safely if possible, 
-- but given the cascade usage in previous migrations, we follow the established pattern.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'matter_lifecycle_state') THEN
        -- We temporarily cast the column to text to allow type change
        ALTER TABLE public.matters ALTER COLUMN lifecycle_state TYPE TEXT;
        
        DROP TYPE public.matter_lifecycle_state;
        
        CREATE TYPE public.matter_lifecycle_state AS ENUM (
            'submitted',    -- Client just submitted
            'reviewing',    -- staff looking at original report
            'case_open',    -- Accepted, but work hasn't started (waiting for first report)
            'in_progress',  -- Substantive work begun (first report published)
            'closed'        -- Resolution summary provided
        );
        
        ALTER TABLE public.matters ALTER COLUMN lifecycle_state TYPE public.matter_lifecycle_state 
        USING (lifecycle_state::public.matter_lifecycle_state);
    END IF;
END $$;

-- 2. ADD CLOSURE METADATA
ALTER TABLE public.matters 
ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- 3. MATTER REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.matter_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    client_id UUID REFERENCES auth.users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(matter_id) -- Only one review per matter
);

-- RLS for Reviews
ALTER TABLE public.matter_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can create their own reviews" 
ON public.matter_reviews FOR INSERT 
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can view their own reviews" 
ON public.matter_reviews FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "Internal staff can view all reviews" 
ON public.matter_reviews FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_firm_roles WHERE user_id = auth.uid()));

-- 4. ENHANCED LIFECYCLE RPC
CREATE OR REPLACE FUNCTION public.transition_matter_lifecycle(
    p_matter_id UUID,
    p_new_state public.matter_lifecycle_state,
    p_resolution_summary TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_state public.matter_lifecycle_state;
    v_firm_id UUID;
BEGIN
    SELECT lifecycle_state, firm_id INTO v_current_state, v_firm_id
    FROM public.matters WHERE id = p_matter_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Matter not found'; END IF;

    -- Update Logic
    UPDATE public.matters
    SET 
        lifecycle_state = p_new_state,
        resolution_summary = COALESCE(p_resolution_summary, resolution_summary),
        closed_at = CASE WHEN p_new_state = 'closed' THEN now() ELSE closed_at END,
        updated_at = now()
    WHERE id = p_matter_id;

    -- Audit
    PERFORM public.log_firm_event(
        v_firm_id, 
        'lifecycle_transition', 
        jsonb_build_object(
            'from', v_current_state, 
            'to', p_new_state, 
            'matter_id', p_matter_id,
            'summary_provided', (p_resolution_summary IS NOT NULL)
        )
    );
END;
$$;

-- 5. AUTOMATION: FIRST REPORT -> IN_PROGRESS
CREATE OR REPLACE FUNCTION public.auto_advance_matter_on_report()
RETURNS TRIGGER AS $$
BEGIN
    -- Only advance if currently in 'case_open' and report is published
    IF NEW.status = 'published' THEN
        UPDATE public.matters 
        SET lifecycle_state = 'in_progress'
        WHERE id = NEW.matter_id AND lifecycle_state = 'case_open';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_advance_matter ON public.matter_updates;
CREATE TRIGGER trigger_auto_advance_matter
AFTER INSERT OR UPDATE OF status ON public.matter_updates
FOR EACH ROW EXECUTE FUNCTION public.auto_advance_matter_on_report();

SELECT '✅ Case Closure System Applied' as status;
