-- ============================================================================
-- DISABLE RLS ON MATTERS (FOR DEVELOPMENT)
-- ============================================================================
ALTER TABLE public.matters DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN '🔒 LOCKED' ELSE '🔓 UNLOCKED' END as status
FROM pg_tables
WHERE tablename IN ('matters', 'invoices', 'payments') 
AND schemaname = 'public';
