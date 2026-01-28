-- ========================================================
-- RLS RECONCILE: CASE ASSIGNMENTS
-- ========================================================

-- Enable RLS (already enabled but making sure)
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- 1. SELECT: Staff can view all assignments for their firm's matters/reports
DROP POLICY IF EXISTS "Staff can view all case assignments" ON public.case_assignments;
CREATE POLICY "Staff can view all case assignments"
ON public.case_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.status = 'active'
    )
);

-- 2. INSERT/UPDATE: Case Managers and Admins can manage assignments
DROP POLICY IF EXISTS "Case Managers and Admins can manage assignments" ON public.case_assignments;
CREATE POLICY "Case Managers and Admins can manage assignments"
ON public.case_assignments FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
    )
);

-- 3. REFRESH SCHEMA CACHE FOR MATTERS (Potential fix for 406)
NOTIFY pgrst, 'reload';

SELECT '✅ Case Assignments RLS Reconciled & Schema Reloaded' AS status;
