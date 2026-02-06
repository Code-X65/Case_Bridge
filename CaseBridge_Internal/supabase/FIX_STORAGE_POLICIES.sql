-- ==========================================
-- FIX STORAGE BUCKET POLICIES
-- Allow clients to upload to their vault
-- ==========================================

-- Step 1: Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('case_documents', 'case_documents', false)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Drop existing storage policies
DROP POLICY IF EXISTS "client_upload_own_vault" ON storage.objects;
DROP POLICY IF EXISTS "client_view_own_vault" ON storage.objects;
DROP POLICY IF EXISTS "client_delete_own_vault" ON storage.objects;
DROP POLICY IF EXISTS "staff_all_storage" ON storage.objects;

-- Step 3: Create storage policies for clients
-- Allow clients to upload to their own vault folder
CREATE POLICY "client_upload_own_vault" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'case_documents' AND
    (storage.foldername(name))[1] = 'vault' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow clients to view their own vault files
CREATE POLICY "client_view_own_vault" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'case_documents' AND
    (storage.foldername(name))[1] = 'vault' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow clients to delete their own vault files
CREATE POLICY "client_delete_own_vault" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'case_documents' AND
    (storage.foldername(name))[1] = 'vault' AND
    (storage.foldername(name))[2] = auth.uid()::text
);

-- Step 4: Allow staff to access all storage
CREATE POLICY "staff_all_storage" ON storage.objects
FOR ALL TO authenticated
USING (
    bucket_id = 'case_documents' AND
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('case_manager', 'associate_lawyer', 'admin_manager')
    )
);

-- Step 5: Verification
SELECT 
    '✅ STORAGE POLICIES CREATED - Clients can now upload to vault' as status,
    (SELECT COUNT(*) FROM storage.buckets WHERE id = 'case_documents') as bucket_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') as storage_policies;
