-- ========================================================
-- STORAGE RLS RECONCILE: CASE DOCUMENTS
-- ========================================================

-- 1. DROP EXISTING POLICIES ON case_documents BUCKET
DROP POLICY IF EXISTS "Client Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Client Read Access" ON storage.objects;
DROP POLICY IF EXISTS "Staff Read Access" ON storage.objects;

-- 2. CLIENT UPLOAD ACCESS: Clients can upload to 'reports/CASE_ID' if they own the report
-- Note: We use the case_reports table to verify ownership
CREATE POLICY "Clients can upload report documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'case_documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'reports'
    AND EXISTS (
        SELECT 1 FROM public.case_reports
        WHERE id::text = (storage.foldername(name))[2]
        AND client_id = auth.uid()
    )
);

-- 3. CLIENT READ ACCESS: Clients can read their own documents
CREATE POLICY "Clients can read own report documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'case_documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'reports'
    AND EXISTS (
        SELECT 1 FROM public.case_reports
        WHERE id::text = (storage.foldername(name))[2]
        AND client_id = auth.uid()
    )
);

-- 4. STAFF ACCESS: Staff can read and upload documents for matters in their firm
CREATE POLICY "Staff can manage all case documents"
ON storage.objects FOR ALL
USING (
    bucket_id = 'case_documents'
    AND auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND status = 'active'
    )
);

SELECT '✅ Storage RLS for case_documents reconciled' as status;
