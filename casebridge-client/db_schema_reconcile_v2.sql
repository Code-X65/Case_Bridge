-- ========================================================
-- SCHEMA RECONCILIATION V2: FIXING TRIGGER CONFLICTS
-- ========================================================

-- 1. DROP CONFLICTING TRIGGER FIRST
-- The 'on_matter_reassigned' trigger depends on columns that might have been renamed.
DROP TRIGGER IF EXISTS on_matter_reassigned ON public.matters;

-- 2. RE-DECLARE COMPATIBLE AUDIT FUNCTION
-- This version only uses 'assigned_associate' and 'assigned_case_manager'
CREATE OR REPLACE FUNCTION public.handle_matter_assignment_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track changes if the column actually exists in the row
    -- We'll use a broad check but stick to the canonical 'assigned_associate'
    IF (old.assigned_associate IS DISTINCT FROM new.assigned_associate) THEN
         PERFORM public.log_firm_event(
            new.firm_id,
            'case_reassigned',
            jsonb_build_object(
                'matter_id', new.id,
                'old_assignee', old.assigned_associate,
                'new_assignee', new.assigned_associate
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SCHEMA NORMALIZATION (Columns Cleanup)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='matters') THEN
        
        -- Add canonical columns if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_associate') THEN
            ALTER TABLE public.matters ADD COLUMN assigned_associate UUID REFERENCES auth.users(id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_case_manager') THEN
            ALTER TABLE public.matters ADD COLUMN assigned_case_manager UUID REFERENCES auth.users(id);
        END IF;

        -- SYNC and DROP the old 'assigned_attorney_id' if it exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_attorney_id') THEN
            UPDATE public.matters SET assigned_associate = assigned_attorney_id WHERE assigned_associate IS NULL;
            ALTER TABLE public.matters DROP COLUMN assigned_attorney_id;
        END IF;

        -- SYNC Registry -> Table (Heal existing data from assignment registry)
        UPDATE public.matters m
        SET assigned_associate = (
            SELECT assigned_to_user_id FROM public.case_assignments ca 
            WHERE ca.target_id = m.id AND ca.target_type = 'matter' AND ca.assigned_role = 'associate_lawyer'
            LIMIT 1
        )
        WHERE assigned_associate IS NULL;
        
    END IF;
END $$;

-- 4. RE-APPLY THE TRIGGER
-- Now that columns are normalized, we can safely re-enable the trigger.
CREATE TRIGGER on_matter_reassigned
AFTER UPDATE ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.handle_matter_assignment_audit();

SELECT '✅ Schema successfully reconciled and trigger conflicts resolved.' as status;
