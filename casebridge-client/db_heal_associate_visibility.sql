-- ========================================================
-- RLS HEAL: ASSOCIATE LAWYER VISIBILITY
-- ========================================================

-- 1. Ensure Associate Lawyers can see the matters they are assigned to
-- We use EITHER the direct column (performance) OR the assignments table (registry truth)
DROP POLICY IF EXISTS "Associate view assigned matters only" ON public.matters;
DROP POLICY IF EXISTS "Matters - Associate Visibility" ON public.matters;

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
        assigned_associate = auth.uid() -- Direct column check
        OR 
        EXISTS (                        -- Registry check
            SELECT 1 FROM public.case_assignments ca
            WHERE ca.target_id = public.matters.id
            AND ca.target_type = 'matter'
            AND ca.assigned_to_user_id = auth.uid()
            AND ca.assigned_role = 'associate_lawyer'
        )
    )
);

-- 2. Ensure data consistency
-- Sync any missing assignments from the registry to the direct columns
UPDATE public.matters m
SET assigned_associate = (
    SELECT assigned_to_user_id 
    FROM public.case_assignments ca 
    WHERE ca.target_id = m.id 
    AND ca.target_type = 'matter' 
    AND ca.assigned_role = 'associate_lawyer'
    LIMIT 1
)
WHERE assigned_associate IS NULL;

-- 3. Sync from Case Managers too
UPDATE public.matters m
SET assigned_case_manager = (
    SELECT assigned_to_user_id 
    FROM public.case_assignments ca 
    WHERE ca.target_id = m.id 
    AND ca.target_type = 'matter' 
    AND ca.assigned_role = 'case_manager'
    LIMIT 1
)
WHERE assigned_case_manager IS NULL;

SELECT '✅ Associate visibility healed and assignments synced.' as status;
