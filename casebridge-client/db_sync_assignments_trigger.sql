-- ========================================================
-- RLS HEAL & ASSIGNMENT SYNC TRIGGER
-- ========================================================

-- 1. Ensure columns exist on matters
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_associate') THEN
        ALTER TABLE public.matters ADD COLUMN assigned_associate UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_case_manager') THEN
        ALTER TABLE public.matters ADD COLUMN assigned_case_manager UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Create Sync Function
CREATE OR REPLACE FUNCTION public.sync_matter_assignments()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.target_type = 'matter' THEN
        IF NEW.assigned_role = 'associate_lawyer' THEN
            UPDATE public.matters SET assigned_associate = NEW.assigned_to_user_id WHERE id = NEW.target_id;
        ELSIF NEW.assigned_role = 'case_manager' THEN
            UPDATE public.matters SET assigned_case_manager = NEW.assigned_to_user_id WHERE id = NEW.target_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger
DROP TRIGGER IF EXISTS trg_sync_matter_assignments ON public.case_assignments;
CREATE TRIGGER trg_sync_matter_assignments
AFTER INSERT OR UPDATE ON public.case_assignments
FOR EACH ROW EXECUTE FUNCTION public.sync_matter_assignments();

-- 4. Re-apply Healed RLS
DROP POLICY IF EXISTS "Associates can view assigned matters" ON public.matters;
DROP POLICY IF EXISTS "Associate view assigned matters only" ON public.matters;

CREATE POLICY "Associates can view assigned matters"
ON public.matters FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.firm_id = public.matters.firm_id
        AND LOWER(ufr.role) = 'associate_lawyer'
        AND ufr.status = 'active'
    )
    AND (
        assigned_associate = auth.uid()
        OR 
        EXISTS (
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.target_id = public.matters.id
            AND ca.target_type = 'matter'
            AND ca.assigned_to_user_id = auth.uid()
            AND ca.assigned_role = 'associate_lawyer'
        )
    )
);

-- 5. Final Sync (Heal historical data)
UPDATE public.matters m
SET 
    assigned_associate = (
        SELECT assigned_to_user_id FROM public.case_assignments ca 
        WHERE ca.target_id = m.id AND ca.target_type = 'matter' AND ca.assigned_role = 'associate_lawyer' LIMIT 1
    ),
    assigned_case_manager = (
        SELECT assigned_to_user_id FROM public.case_assignments ca 
        WHERE ca.target_id = m.id AND ca.target_type = 'matter' AND ca.assigned_role = 'case_manager' LIMIT 1
    );

SELECT '✅ Automatic assignment sync established and RLS healed.' as status;
