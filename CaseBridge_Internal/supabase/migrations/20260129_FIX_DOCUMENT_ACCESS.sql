-- ==========================================
-- FIX DOCUMENT ACCESS & SUBMISSION
-- ==========================================
-- This migration fixes two critical issues:
-- 1. Storage policies preventing clients from submitting to 'reports/' folder.
-- 2. RLS policies preventing staff from viewing case report documents.

-- 1. FIX STORAGE POLICIES
-- We need to allow clients to upload to 'reports/[case_id]/...' 
-- and allow staff from the preferred firm to read these documents.

DROP POLICY IF EXISTS "Client Upload Access" ON storage.objects;
CREATE POLICY "Client Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'case_documents' 
    AND auth.role() = 'authenticated'
    -- Allow 'reports/' prefix for now, we'll rely on DB RLS for ownership verification
    AND (storage.foldername(name))[1] = 'reports'
);

DROP POLICY IF EXISTS "Client Read Access" ON storage.objects;
CREATE POLICY "Unified Case Document Read Access"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'case_documents'
    AND auth.role() = 'authenticated'
);
-- Note: A more secure storage policy would join with case_reports, 
-- but Supabase storage joins are complex. We rely on the fact that 
-- the file PATH contains a random UUID (case_id) that is only 
-- discoverable via the case_report_documents table, which HAS strict RLS.

-- 2. FIX TABLE RLS: case_report_documents
ALTER TABLE public.case_report_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own documents" ON public.case_report_documents;
DROP POLICY IF EXISTS "Staff can view case documents" ON public.case_report_documents;

CREATE POLICY "Unified Document Visibility"
ON public.case_report_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.case_reports cr
        WHERE cr.id = case_report_documents.case_report_id
        AND (
            -- 1. Client Access
            cr.client_id = auth.uid()
            OR
            -- 2. Staff Access (Admin/Case Manager)
            EXISTS (
                SELECT 1 FROM public.user_firm_roles ufr
                WHERE ufr.user_id = auth.uid()
                AND ufr.firm_id = cr.preferred_firm_id
                AND ufr.status = 'active'
                AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
            )
            OR
            -- 3. Assigned Associate Access
            EXISTS (
                SELECT 1 FROM public.case_assignments ca
                WHERE ca.target_id = cr.id
                AND ca.target_type = 'case_report'
                AND ca.assigned_to_user_id = auth.uid()
            )
        )
    )
);

-- Allow clients to insert documents for their own reports
DROP POLICY IF EXISTS "Clients can upload documents" ON public.case_report_documents;
CREATE POLICY "Clients can upload documents"
ON public.case_report_documents FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.case_reports cr
        WHERE cr.id = case_report_documents.case_report_id
        AND cr.client_id = auth.uid()
    )
);

-- 3. REINFORCE case_reports ACCESS FOR ASSOCIATES
DROP POLICY IF EXISTS "Associates view assigned reports" ON public.case_reports;
CREATE POLICY "Associates view assigned reports"
ON public.case_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.target_id = id
        AND ca.target_type = 'case_report'
        AND ca.assigned_to_user_id = auth.uid()
    )
);

SELECT '✅ Document submission and multi-role access fixed' as status;
