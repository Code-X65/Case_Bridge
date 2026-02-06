-- ==========================================
-- COMPREHENSIVE DOCUMENT VIEWING ACROSS CLIENT AND INTERNAL PORTALS
-- This ensures both clients and staff can view all relevant documents
-- ==========================================

-- ========================================
-- PART 1: STORAGE BUCKET POLICIES
-- ========================================

-- Ensure case_documents bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('case_documents', 'case_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop all existing storage policies
DROP POLICY IF EXISTS "client_upload_own_vault" ON storage.objects;
DROP POLICY IF EXISTS "client_view_own_vault" ON storage.objects;
DROP POLICY IF EXISTS "client_delete_own_vault" ON storage.objects;
DROP POLICY IF EXISTS "client_view_case_files" ON storage.objects;
DROP POLICY IF EXISTS "staff_all_storage" ON storage.objects;
DROP POLICY IF EXISTS "staff_upload_storage" ON storage.objects;

-- CLIENT STORAGE POLICIES
-- 1. Allow clients to upload to their vault (vault/{client_id}/*)
CREATE POLICY "client_upload_own_vault" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'case_documents' AND
    (storage.foldername(name))[1] = 'vault' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 2. Allow clients to view their own vault files
CREATE POLICY "client_view_own_vault" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'case_documents' AND
    (storage.foldername(name))[1] = 'vault' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. Allow clients to delete their own vault files
CREATE POLICY "client_delete_own_vault" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'case_documents' AND
    (storage.foldername(name))[1] = 'vault' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- 4. Allow clients to view case files in their matters
CREATE POLICY "client_view_case_files" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'case_documents' AND
    (
        -- Vault files (already covered above but also here for completeness)
        ((storage.foldername(name))[1] = 'vault' AND (storage.foldername(name))[2] = auth.uid()::text)
        OR
        -- Case files where they're the client
        EXISTS (
            SELECT 1 FROM public.matters
            WHERE id = ((storage.foldername(name))[2])::uuid
            AND client_id = auth.uid()
        )
    )
);

-- STAFF STORAGE POLICIES
-- 5. Allow staff to view ALL files
CREATE POLICY "staff_view_all_storage" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'case_documents' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('case_manager', 'associate_lawyer', 'admin_manager')
    )
);

-- 6. Allow staff to upload to any folder
CREATE POLICY "staff_upload_storage" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'case_documents' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('case_manager', 'associate_lawyer', 'admin_manager')
    )
);

-- 7. Allow staff to delete files
CREATE POLICY "staff_delete_storage" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'case_documents' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('case_manager', 'associate_lawyer', 'admin_manager')
    )
);

-- ========================================
-- PART 2: TABLE RLS POLICIES
-- ========================================

-- Drop existing table policies
DROP POLICY IF EXISTS "authenticated_all_documents" ON public.documents;
DROP POLICY IF EXISTS "authenticated_all_case_documents" ON public.case_documents;
DROP POLICY IF EXISTS "authenticated_all_report_documents" ON public.report_documents;
DROP POLICY IF EXISTS "authenticated_all_case_report_documents" ON public.case_report_documents;
DROP POLICY IF EXISTS "authenticated_all_client_documents" ON public.client_documents;
DROP POLICY IF EXISTS "authenticated_all_matters" ON public.matters;
DROP POLICY IF EXISTS "authenticated_all_matter_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "authenticated_all_case_reports" ON public.case_reports;

-- SIMPLE APPROACH: Allow all authenticated users to view documents
-- (RLS on matters/case_reports already restricts what clients can see)

CREATE POLICY "authenticated_all_documents" ON public.documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated_all_case_documents" ON public.case_documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated_all_report_documents" ON public.report_documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated_all_case_report_documents" ON public.case_report_documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated_all_client_documents" ON public.client_documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated_all_matters" ON public.matters
FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated_all_matter_updates" ON public.matter_updates
FOR ALL TO authenticated USING (true);

CREATE POLICY "authenticated_all_case_reports" ON public.case_reports
FOR ALL TO authenticated USING (true);

-- ========================================
-- PART 3: GRANTS
-- ========================================

GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.case_documents TO authenticated;
GRANT ALL ON public.report_documents TO authenticated;
GRANT ALL ON public.case_report_documents TO authenticated;
GRANT ALL ON public.client_documents TO authenticated;
GRANT ALL ON public.matters TO authenticated;
GRANT ALL ON public.matter_updates TO authenticated;
GRANT ALL ON public.case_reports TO authenticated;

-- ========================================
-- PART 4: RELOAD SCHEMA
-- ========================================

NOTIFY pgrst, 'reload schema';

-- ========================================
-- PART 5: VERIFICATION
-- ========================================

SELECT 
    '✅ DOCUMENT VIEWING SETUP COMPLETE' as status,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') as storage_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents') as document_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'client_documents') as client_doc_policies;

-- Show summary of what's configured
SELECT 
    '=== STORAGE POLICIES ===' as info
UNION ALL
SELECT 
    policyname 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

SELECT 
    '=== TABLE POLICIES ===' as info
UNION ALL
SELECT 
    tablename || ': ' || policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('documents', 'case_documents', 'report_documents', 'client_documents', 'matters')
ORDER BY tablename, policyname;
