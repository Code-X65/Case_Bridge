-- ========================================================
-- FIX ASSOCIATE VISIBILITY V2 (CLEAN SCRIPT)
-- ========================================================

-- 1. ENABLE ASSIGNMENT VISIBILITY
-- Associates must be able to see their own assignments to verify access
DROP POLICY IF EXISTS "Users view own assignments" ON public.case_assignments;
CREATE POLICY "Users view own assignments" ON public.case_assignments 
FOR SELECT USING (assigned_to_user_id = auth.uid());

-- 2. ENABLE LINKED REPORT VISIBILITY
-- Associates view reports if they are assigned to the Matter that owns the report
DROP POLICY IF EXISTS "Associates view linked reports" ON public.case_reports;
CREATE POLICY "Associates view linked reports" ON public.case_reports 
FOR SELECT USING (
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

-- 3. ENABLE LINKED DOCUMENT VISIBILITY
-- Associates view documents if they are assigned to the Matter that owns the report
DROP POLICY IF EXISTS "Associates view linked docs" ON public.case_report_documents;
CREATE POLICY "Associates view linked docs" ON public.case_report_documents 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.matters m
        JOIN public.case_assignments ca ON ca.target_id = m.id
        WHERE m.case_report_id = case_report_documents.case_report_id
        AND ca.assigned_to_user_id = auth.uid()
        AND ca.target_type = 'matter'
    )
);

SELECT '✅ Associate Permissions Successfully Updated' as status;
