-- ==========================================
-- ABSOLUTE FINAL FIX - FOREIGN KEY RELATIONSHIPS
-- This adds the foreign key constraints needed for nested queries
-- ==========================================

-- First, ensure tables exist
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT,
    file_url TEXT,
    uploaded_by_user_id UUID,
    uploaded_by_role TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.matter_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID,
    author_id UUID,
    author_role TEXT,
    title TEXT,
    content TEXT,
    client_visible BOOLEAN DEFAULT TRUE,
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add foreign key from report_documents.document_id to documents.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_documents_document_id_fkey'
        AND table_name = 'report_documents'
    ) THEN
        ALTER TABLE public.report_documents
        ADD CONSTRAINT report_documents_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key from report_documents.report_id to matter_updates.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_documents_report_id_fkey'
        AND table_name = 'report_documents'
    ) THEN
        ALTER TABLE public.report_documents
        ADD CONSTRAINT report_documents_report_id_fkey
        FOREIGN KEY (report_id) REFERENCES public.matter_updates(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Reload schema so Supabase recognizes the relationships
NOTIFY pgrst, 'reload schema';

-- Verify the foreign keys are created
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'report_documents'
    AND tc.table_schema = 'public';

SELECT '✅ FOREIGN KEYS CREATED - Nested queries will now work' as status;
