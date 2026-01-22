-- ============================================================================
-- DIAGNOSTIC: Check User Profile and RLS Status
-- ============================================================================
-- Run this to diagnose why login is failing
-- ============================================================================

-- 1. Check if RLS is enabled on profiles
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '❌ RLS IS ENABLED (THIS IS THE PROBLEM!)'
        ELSE '✅ RLS IS DISABLED (GOOD)'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 2. Check the invited user's profile
-- Replace 'email@example.com' with the actual email of the associate lawyer
SELECT 
    id,
    email,
    first_name,
    last_name,
    internal_role,
    status,
    firm_id,
    CASE 
        WHEN internal_role IS NULL THEN '❌ NO INTERNAL_ROLE (THIS IS THE PROBLEM!)'
        WHEN status != 'active' THEN '❌ STATUS IS NOT ACTIVE (THIS IS THE PROBLEM!)'
        WHEN firm_id IS NULL THEN '❌ NO FIRM_ID (THIS IS THE PROBLEM!)'
        ELSE '✅ PROFILE LOOKS GOOD'
    END as diagnosis
FROM public.profiles
WHERE email = 'REPLACE_WITH_ACTUAL_EMAIL@example.com';

-- 3. Check all internal users
SELECT 
    email,
    internal_role,
    status,
    firm_id,
    created_at
FROM public.profiles
WHERE internal_role IS NOT NULL
ORDER BY created_at DESC;

-- ============================================================================
-- FIXES BASED ON DIAGNOSIS:
-- ============================================================================

-- FIX 1: If RLS is enabled, disable it:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- FIX 2: If user has no internal_role, set it manually:
-- UPDATE public.profiles
-- SET 
--     internal_role = 'associate_lawyer',
--     status = 'active',
--     firm_id = '00000000-0000-0000-0000-000000000001'
-- WHERE email = 'user@example.com';

-- FIX 3: If user status is not active, activate them:
-- UPDATE public.profiles
-- SET status = 'active'
-- WHERE email = 'user@example.com';

-- ============================================================================
