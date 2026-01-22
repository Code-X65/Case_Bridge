-- ============================================================================
-- DISABLE RLS ON PROFILES TABLE (CLIENT PORTAL)
-- ============================================================================
-- This fixes the loading hang issue when checking for internal_role
-- ============================================================================

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Verify the change
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ⚠️'
        ELSE 'RLS DISABLED ✅'
    END as status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- ============================================================================
-- EXPECTED RESULT:
-- profiles | RLS DISABLED ✅
-- ============================================================================
