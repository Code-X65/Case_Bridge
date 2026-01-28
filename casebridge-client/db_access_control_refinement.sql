-- ========================================================
-- ACCESS CONTROL REFINEMENT V1
-- ========================================================

-- 1. Refine Case Reports RLS (Intake)
-- Only Admin Manager and Case Manager should see client reports.
-- Associate Lawyers should not have access to the intake pool.

DROP POLICY IF EXISTS "Staff can view relevant case reports" ON public.case_reports;
DROP POLICY IF EXISTS "Staff can update relevant case reports" ON public.case_reports;

CREATE POLICY "Admin/CM can view relevant case reports"
ON public.case_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
        AND (
            public.case_reports.preferred_firm_id = ufr.firm_id
            OR
            public.case_reports.preferred_firm_id IS NULL
        )
    )
);

CREATE POLICY "Admin/CM can update relevant case reports"
ON public.case_reports FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
        AND (
            public.case_reports.preferred_firm_id = ufr.firm_id
            OR
            public.case_reports.preferred_firm_id IS NULL
        )
    )
);

-- 2. Refine Matters RLS
-- Confirming strict role-based isolation.

DROP POLICY IF EXISTS "Admins and CMs view firm matters" ON public.matters;
DROP POLICY IF EXISTS "Associates view assigned matters" ON public.matters;
DROP POLICY IF EXISTS "Staff can view firm matters" ON public.matters; -- Old policy from early schema

-- Admin & Case Manager: View ALL firm matters
CREATE POLICY "Admin and CM view all firm matters" 
ON public.matters 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND LOWER(role) IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
);

-- Associate: View ONLY assigned matters
CREATE POLICY "Associate view assigned matters only" 
ON public.matters 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND LOWER(role) = 'associate_lawyer'
        AND status = 'active'
    )
    AND
    matters.assigned_associate = auth.uid()
);

-- Update and Insert logic for Matters
DROP POLICY IF EXISTS "CM update matters" ON public.matters;
CREATE POLICY "CM and Admin can update matters"
ON public.matters FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND LOWER(role) IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "CM create matters" ON public.matters;
CREATE POLICY "CM and Admin can create matters"
ON public.matters FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND LOWER(role) IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
);

SELECT '✅ Role-Based Access Control Refinement Applied' as status;
