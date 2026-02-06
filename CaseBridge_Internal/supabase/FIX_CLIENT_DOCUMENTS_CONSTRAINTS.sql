-- ==========================================
-- FIX CLIENT_DOCUMENTS NOT NULL CONSTRAINT
-- ==========================================

-- Step 1: Drop NOT NULL constraint on firm_id in client_documents
ALTER TABLE public.client_documents 
ALTER COLUMN firm_id DROP NOT NULL;

-- Step 2: Also make file_name and file_url nullable (in case they're required)
ALTER TABLE public.client_documents 
ALTER COLUMN file_name DROP NOT NULL;

ALTER TABLE public.client_documents 
ALTER COLUMN file_url DROP NOT NULL;

-- Step 3: Reload schema
NOTIFY pgrst, 'reload schema';

-- Step 4: Verification
SELECT 
    '✅ CONSTRAINTS REMOVED - Client can now upload to vault' as status,
    column_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'client_documents'
AND column_name IN ('firm_id', 'file_name', 'file_url')
ORDER BY column_name;
