-- ============================================================================
-- DISABLE RLS ON ALL INTERNAL TABLES (FOR DEVELOPMENT)
-- ============================================================================
-- This disables RLS on all internal platform tables to allow development
-- WARNING: For development only! Re-enable for production!
-- ============================================================================

-- Disable RLS on profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on invitations  
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;

-- Disable RLS on audit_logs
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on case_logs
ALTER TABLE public.case_logs DISABLE ROW LEVEL SECURITY;

-- Disable RLS on case_assignments
ALTER TABLE public.case_assignments DISABLE ROW LEVEL SECURITY;

-- Disable RLS on notifications
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- Keep RLS enabled on firms (it's simple enough)
-- ALTER TABLE public.firms DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS ENABLED'
        ELSE '🔓 RLS DISABLED'
    END as status
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename IN (
    'profiles',
    'invitations',
    'audit_logs',
    'case_logs',
    'case_assignments',
    'notifications',
    'firms'
)
ORDER BY tablename;

-- ============================================================================
-- EXPECTED RESULTS (for development):
-- ============================================================================
-- audit_logs         | 🔓 RLS DISABLED
-- case_assignments   | 🔓 RLS DISABLED
-- case_logs          | 🔓 RLS DISABLED
-- firms              | 🔒 RLS ENABLED
-- invitations        | 🔓 RLS DISABLED
-- notifications      | 🔓 RLS DISABLED
-- profiles           | 🔓 RLS DISABLED
-- ============================================================================

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. This is for DEVELOPMENT ONLY
-- 2. Your application code still enforces firm_id checks
-- 3. For PRODUCTION, you must:
--    a. Re-enable RLS on all tables
--    b. Create proper policies
--    c. Test thoroughly
--
-- To re-enable RLS later:
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.case_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- ============================================================================
