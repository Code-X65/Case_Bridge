-- ============================================================================
-- FIX: Allow profile creation during invitation acceptance
-- ============================================================================
-- This allows unauthenticated users to create/update their profile
-- when accepting an invitation
-- ============================================================================

-- First, let's see what RLS policies exist on profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- ============================================================================
-- Add policy to allow users to insert their own profile
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- Add policy to allow users to update their own profile
-- ============================================================================

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- ============================================================================
-- Add policy to allow users to view their own profile
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
    policyname,
    cmd,
    CASE 
        WHEN cmd = 'SELECT' THEN 'View'
        WHEN cmd = 'INSERT' THEN 'Create'
        WHEN cmd = 'UPDATE' THEN 'Update'
        WHEN cmd = 'DELETE' THEN 'Delete'
    END as action
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- EXPECTED POLICIES:
-- ============================================================================
-- 1. "Users can insert their own profile" - INSERT
-- 2. "Users can update their own profile" - UPDATE  
-- 3. "Users can view their own profile" - SELECT
-- ============================================================================
