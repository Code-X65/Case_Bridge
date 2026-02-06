-- ==========================================
-- DIAGNOSTIC: Check report_documents table
-- ==========================================

-- 1. Check if report_documents table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'report_documents'
        ) THEN '✅ report_documents table EXISTS'
        ELSE '❌ report_documents table DOES NOT EXIST'
    END as table_status;

-- 2. Check all columns in report_documents
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'report_documents'
ORDER BY ordinal_position;

-- 3. Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'report_documents';

-- 4. Check if documents table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'documents'
        ) THEN '✅ documents table EXISTS'
        ELSE '❌ documents table DOES NOT EXIST'
    END as documents_table_status;

-- 5. Check all columns in documents
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
ORDER BY ordinal_position;

-- 6. Check if matter_updates table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = 'matter_updates'
        ) THEN '✅ matter_updates table EXISTS'
        ELSE '❌ matter_updates table DOES NOT EXIST'
    END as matter_updates_status;

-- 7. Sample data check
SELECT 
    'report_documents' as table_name,
    COUNT(*) as row_count
FROM public.report_documents
UNION ALL
SELECT 
    'documents' as table_name,
    COUNT(*) as row_count
FROM public.documents
UNION ALL
SELECT 
    'matter_updates' as table_name,
    COUNT(*) as row_count
FROM public.matter_updates;

-- 8. Check RLS policies on report_documents
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'report_documents';
