-- ==========================================
-- DIAGNOSTIC: Check matter_updates table
-- ==========================================

-- Check if table exists and show its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'matter_updates'
ORDER BY ordinal_position;

-- Check RLS policies
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
WHERE tablename = 'matter_updates';

-- Check if the security functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_admin_or_case_manager', 'is_associate_lawyer', 'is_assigned_to_matter');
