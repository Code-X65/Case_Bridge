-- ========================================================
-- FIX ASSOCIATE VISIBILITY & PERMISSIONS
-- ========================================================

-- 1. FIX CASE ASSIGNMENTS VISIBILITY
-- Associates must be able to see their own assignments for downstream RLS to work.
DROP POLICY IF EXISTS "Users view own assignments" ON public.case_assignments;
CREATE POLICY "Users view own assignments"
ON public.case_assignments FOR SELECT
USING (assigned_to_user_id = auth.uid());


-- 2. FIX REPORT VISIBILITY FOR ASSOCIATES
-- Associates are assigned to MATTERS, not reports directly.
-- We must allow them to see reports linked to matters they work on.
DROP POLICY IF EXISTS "Associates view linked reports" ON public.case_reports;
CREATE POLICY "Associates view linked reports"
ON public.case_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matters m
        JOIN public.case_assignments ca ON ca.target_id = m.id
        WHERE m.case_report_id = case_reports.id
        AND ca.assigned_to_user_id = auth.uid()
        AND ca.target_type = 'matter'
    )
    OR
    EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.target_id = case_reports.id
        AND ca.target_type = 'case_report'
        AND ca.assigned_to_user_id = auth.uid()
    )
);


-- 3. FIX DOCUMENT TABLE VISIBILITY
-- Ensure queries to case_report_documents refer to updated report policies
DROP POLICY IF EXISTS "Associates view linked docs" ON public.case_report_documents;
CREATE POLICY "Associates view linked docs"
ON public.case_report_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.case_reports cr
        WHERE cr.id = case_report_documents.case_report_id
        AND (
            -- Either they own the report (client) or have access via policies above (associate/staff)
            -- But for performance, we can re-implement the check logic or rely on report visibility if traversing
            -- Simplest is to delegate to the reports table which we just fixed:
            EXISTS (
                SELECT 1 FROM public.matters m
                JOIN public.case_assignments ca ON ca.target_id = m.id
                WHERE m.case_report_id = cr.id
                AND ca.assigned_to_user_id = auth.uid()
                AND ca.target_type = 'matter'
            )
        )
    )
);

-- Note: "Internal staff can view case docs" policy might already cover this if it's broad. 
-- But adding specific access is safer.
-- If the existing policy is "role IN ('admin','case_manager')", then Associates were excluded.
-- If it was "EXISTS user_firm_roles", they were included.
-- Check: "Internal staff can view case docs" uses EXISTS(user_firm_roles).
-- So associates *should* have seen documents IF they could see the parents. 
-- The main fix here is #1 (case_assignments) and #2 (case_reports).

SELECT '✅ Associate Visibility Fixed' as status;
