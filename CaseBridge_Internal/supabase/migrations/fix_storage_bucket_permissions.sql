-- ============================================================================
-- DIAGNOSTIC & FIX: Court Reports Storage Bucket
-- ============================================================================
-- Run these queries one by one to diagnose and fix the storage issue
-- ============================================================================

-- ============================================================================
-- STEP 1: CHECK IF BUCKET EXISTS AND ITS SETTINGS
-- ============================================================================

SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets
WHERE id = 'court-reports';

-- Expected: Should show the bucket
-- If public = false, that's the problem!

-- ============================================================================
-- STEP 2: MAKE BUCKET PUBLIC (if it's private)
-- ============================================================================

UPDATE storage.buckets
SET public = true
WHERE id = 'court-reports';

-- ============================================================================
-- STEP 3: CHECK STORAGE POLICIES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';

-- ============================================================================
-- STEP 4: CREATE/UPDATE STORAGE POLICIES
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Associate lawyers can upload court report files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view court report files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view court report files" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to court-reports bucket
CREATE POLICY "Allow authenticated uploads to court-reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'court-reports'
);

-- Policy 2: Allow authenticated users to view files in court-reports bucket
CREATE POLICY "Allow authenticated reads from court-reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'court-reports'
);

-- Policy 3: Allow public access (since bucket is public)
CREATE POLICY "Allow public reads from court-reports"
ON storage.objects FOR SELECT
TO public
USING (
    bucket_id = 'court-reports'
);

-- ============================================================================
-- STEP 5: VERIFY POLICIES ARE CREATED
-- ============================================================================

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%court-reports%';

-- Should show 3 policies:
-- 1. Allow authenticated uploads to court-reports (INSERT)
-- 2. Allow authenticated reads from court-reports (SELECT)
-- 3. Allow public reads from court-reports (SELECT)

-- ============================================================================
-- STEP 6: TEST QUERY (run this to verify bucket is accessible)
-- ============================================================================

SELECT 
    name,
    bucket_id,
    owner,
    created_at,
    updated_at,
    metadata
FROM storage.objects
WHERE bucket_id = 'court-reports'
ORDER BY created_at DESC
LIMIT 10;

-- This should work without errors (might be empty if no files uploaded yet)

-- ============================================================================
-- ALTERNATIVE: If you want to recreate the bucket from scratch
-- ============================================================================

-- WARNING: This will delete all existing files in the bucket!
-- Only run if you're sure you want to start fresh

/*
-- Delete all files first
DELETE FROM storage.objects WHERE bucket_id = 'court-reports';

-- Delete the bucket
DELETE FROM storage.buckets WHERE id = 'court-reports';

-- Recreate the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'court-reports',
    'court-reports',
    true,
    52428800  -- 50MB
);

-- Then run STEP 4 again to create policies
*/

-- ============================================================================
-- SUMMARY OF FIXES
-- ============================================================================

-- After running the above:
-- 1. Bucket should be public
-- 2. Storage policies should allow uploads and downloads
-- 3. Test by uploading a court report with attachments
