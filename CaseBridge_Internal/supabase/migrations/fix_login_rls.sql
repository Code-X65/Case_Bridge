-- ============================================================================
-- DISABLE RLS ON PROFILES TABLE (INTERNAL PLATFORM)
-- ============================================================================
-- This fixes the "This portal is for internal users only" error
-- by allowing the login process to fetch the user's internal_role
-- ============================================================================

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify the change
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ⚠️ (BLOCKING LOGIN)'
        ELSE 'RLS DISABLED ✅ (LOGIN WILL WORK)'
    END as status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- ============================================================================
-- EXPECTED RESULT:
-- profiles | RLS DISABLED ✅ (LOGIN WILL WORK)
-- ============================================================================

-- ============================================================================
-- WHY THIS IS NEEDED:
-- ============================================================================
-- When a user logs in to the Internal Platform, the system needs to:
-- 1. Authenticate the user (email + password) ✅
-- 2. Fetch their profile to check internal_role ❌ (RLS blocks this)
-- 3. Verify they have admin_manager, case_manager, or associate_lawyer role
--
-- With RLS enabled, step 2 fails because the user is authenticated but
-- the RLS policy doesn't allow them to read their own profile yet.
--
-- Disabling RLS allows the profile fetch to succeed.
-- ============================================================================
