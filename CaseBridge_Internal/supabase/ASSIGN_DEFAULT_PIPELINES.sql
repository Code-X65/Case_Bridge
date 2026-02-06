-- ==========================================
-- ASSIGN DEFAULT PIPELINES TO EXISTING MATTERS
-- ==========================================

DO $$
DECLARE
    v_criminal_pipeline_id UUID;
    v_criminal_first_stage_id UUID;
BEGIN
    -- 1. Get the default criminal pipeline and its first stage
    SELECT id INTO v_criminal_pipeline_id 
    FROM public.case_pipelines 
    WHERE name = 'Criminal Defense Standard' 
    LIMIT 1;

    SELECT id INTO v_criminal_first_stage_id 
    FROM public.case_stages 
    WHERE pipeline_id = v_criminal_pipeline_id 
    ORDER BY order_index ASC 
    LIMIT 1;

    -- 2. Assign to matters that don't have a pipeline yet
    UPDATE public.matters
    SET 
        pipeline_id = v_criminal_pipeline_id,
        current_stage_id = v_criminal_first_stage_id
    WHERE pipeline_id IS NULL;

    -- 3. Verification
    RAISE NOTICE 'Assigned pipeline % and stage % to matters.', v_criminal_pipeline_id, v_criminal_first_stage_id;
END $$;

SELECT 
    id, 
    title, 
    pipeline_id, 
    current_stage_id 
FROM public.matters;
