-- ==========================================
-- DIAGNOSTIC: Check Current Database State
-- ==========================================
-- Run this first to see what we're working with

-- 1. Check notifications table structure
SELECT 
    'notifications' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 2. Check if notifications table exists at all
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'notifications'
        ) THEN 'notifications table EXISTS'
        ELSE 'notifications table DOES NOT EXIST'
    END as status;

-- 3. Check matter_updates table structure
SELECT 
    'matter_updates' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'matter_updates'
ORDER BY ordinal_position;

-- 4. Check documents table structure
SELECT 
    'documents' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'documents'
ORDER BY ordinal_position;

-- 5. Check case_documents table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'case_documents'
        ) THEN 'case_documents table EXISTS'
        ELSE 'case_documents table DOES NOT EXIST'
    END as status;

-- 6. Check report_documents table
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'report_documents'
        ) THEN 'report_documents table EXISTS'
        ELSE 'report_documents table DOES NOT EXIST'
    END as status;

-- 7. Check what security functions exist
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('is_staff', 'is_admin_or_case_manager', 'is_associate_lawyer', 'is_assigned_to_matter', 'create_notification')
ORDER BY routine_name;
