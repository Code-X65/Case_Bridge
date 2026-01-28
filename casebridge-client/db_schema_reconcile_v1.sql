-- ========================================================
-- SCHEMA RECONCILIATION: Matters & Assignments
-- ========================================================

DO $$ 
BEGIN
    -- 1. Add Assignment Columns to Matters (for UI performance and simpler queries)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='matters') THEN
        
        -- Primary Associate Assignment
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_associate') THEN
            ALTER TABLE public.matters ADD COLUMN assigned_associate UUID REFERENCES auth.users(id);
        END IF;

        -- Primary Case Manager Assignment
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_case_manager') THEN
            ALTER TABLE public.matters ADD COLUMN assigned_case_manager UUID REFERENCES auth.users(id);
        END IF;

        -- Sync existing assignments if any (Registry -> Table)
        UPDATE public.matters m
        SET assigned_associate = (
            SELECT assigned_to_user_id FROM public.case_assignments ca 
            WHERE ca.target_id = m.id AND ca.target_type = 'matter' AND ca.assigned_role = 'associate_lawyer'
            LIMIT 1
        )
        WHERE assigned_associate IS NULL;

    END IF;

END $$;

SELECT '✅ Schema successfully reconciled with UI expectations.' as status;
