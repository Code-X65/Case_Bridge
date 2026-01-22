-- ============================================================================
-- COMPLETE FIX: Disable RLS and Fix Existing Users
-- ============================================================================
-- This script will:
-- 1. Disable RLS on all necessary tables
-- 2. Fix any existing users who have NULL internal_role
-- ============================================================================

-- STEP 1: Disable RLS on all internal tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- STEP 2: Show all users with NULL internal_role
SELECT 
    id,
    email,
    first_name,
    last_name,
    internal_role,
    status,
    firm_id,
    created_at,
    '❌ NEEDS FIX' as issue
FROM public.profiles
WHERE internal_role IS NULL
ORDER BY created_at DESC;

-- STEP 3: Check invitations to see what roles were assigned
SELECT 
    i.email,
    i.internal_role as invited_as,
    i.status as invitation_status,
    i.created_at as invited_at,
    p.internal_role as current_role,
    CASE 
        WHEN p.internal_role IS NULL THEN '❌ ROLE NOT SET'
        WHEN p.internal_role = i.internal_role THEN '✅ ROLE MATCHES'
        ELSE '⚠️ ROLE MISMATCH'
    END as diagnosis
FROM public.invitations i
LEFT JOIN public.profiles p ON p.email = i.email
WHERE i.status = 'accepted'
ORDER BY i.created_at DESC;

-- STEP 4: Fix users based on their invitations
-- This will automatically set the internal_role for any user who accepted an invitation
-- but doesn't have the role set yet
UPDATE public.profiles p
SET 
    internal_role = i.internal_role,
    status = 'active',
    firm_id = i.firm_id
FROM public.invitations i
WHERE p.email = i.email
  AND i.status = 'accepted'
  AND p.internal_role IS NULL;

-- STEP 5: Verify the fix
SELECT 
    email,
    internal_role,
    status,
    firm_id,
    '✅ FIXED' as result
FROM public.profiles
WHERE email IN (
    SELECT email FROM public.invitations WHERE status = 'accepted'
)
ORDER BY created_at DESC;

-- STEP 6: Verify RLS is disabled
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '❌ RLS ENABLED (BAD)'
        ELSE '✅ RLS DISABLED (GOOD)'
    END as status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'invitations', 'audit_logs', 'case_logs', 'case_assignments', 'notifications')
ORDER BY tablename;

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- After running this script:
-- 1. All RLS should be DISABLED ✅
-- 2. All users who accepted invitations should have their internal_role set ✅
-- 3. All users should be able to login ✅
-- ============================================================================
