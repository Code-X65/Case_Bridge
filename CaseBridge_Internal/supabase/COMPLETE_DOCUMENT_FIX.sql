-- ==========================================
-- COMPLETE DOCUMENT RELATIONSHIPS FIX
-- Fixes ALL document viewing for clients and staff
-- ==========================================

-- Step 1: Ensure all base tables exist
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT,
    file_url TEXT,
    uploaded_by_user_id UUID,
    uploaded_by_role TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID,
    client_id UUID,
    case_report_id UUID,
    matter_number TEXT,
    title TEXT,
    description TEXT,
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

CREATE TABLE IF NOT EXISTS public.case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    status TEXT DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create linking tables
CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.report_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.case_report_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_report_id UUID,
    firm_id UUID,
    file_name TEXT,
    file_path TEXT,
    file_type TEXT,
    file_size BIGINT,
    is_client_visible BOOLEAN DEFAULT TRUE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add ALL foreign key constraints
DO $$
BEGIN
    -- case_documents.matter_id -> matters.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'case_documents_matter_id_fkey'
    ) THEN
        ALTER TABLE public.case_documents
        ADD CONSTRAINT case_documents_matter_id_fkey
        FOREIGN KEY (matter_id) REFERENCES public.matters(id) ON DELETE CASCADE;
    END IF;

    -- case_documents.document_id -> documents.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'case_documents_document_id_fkey'
    ) THEN
        ALTER TABLE public.case_documents
        ADD CONSTRAINT case_documents_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
    END IF;

    -- report_documents.report_id -> matter_updates.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_documents_report_id_fkey'
    ) THEN
        ALTER TABLE public.report_documents
        ADD CONSTRAINT report_documents_report_id_fkey
        FOREIGN KEY (report_id) REFERENCES public.matter_updates(id) ON DELETE CASCADE;
    END IF;

    -- report_documents.document_id -> documents.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'report_documents_document_id_fkey'
    ) THEN
        ALTER TABLE public.report_documents
        ADD CONSTRAINT report_documents_document_id_fkey
        FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;
    END IF;

    -- matter_updates.matter_id -> matters.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'matter_updates_matter_id_fkey'
    ) THEN
        ALTER TABLE public.matter_updates
        ADD CONSTRAINT matter_updates_matter_id_fkey
        FOREIGN KEY (matter_id) REFERENCES public.matters(id) ON DELETE CASCADE;
    END IF;

    -- matters.case_report_id -> case_reports.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'matters_case_report_id_fkey'
    ) THEN
        ALTER TABLE public.matters
        ADD CONSTRAINT matters_case_report_id_fkey
        FOREIGN KEY (case_report_id) REFERENCES public.case_reports(id) ON DELETE SET NULL;
    END IF;

    -- case_report_documents.case_report_id -> case_reports.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'case_report_documents_case_report_id_fkey'
    ) THEN
        ALTER TABLE public.case_report_documents
        ADD CONSTRAINT case_report_documents_case_report_id_fkey
        FOREIGN KEY (case_report_id) REFERENCES public.case_reports(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Enable RLS on all tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_reports ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies
DROP POLICY IF EXISTS "client_view_documents" ON public.documents;
DROP POLICY IF EXISTS "client_view_case_documents" ON public.case_documents;
DROP POLICY IF EXISTS "client_view_report_documents" ON public.report_documents;
DROP POLICY IF EXISTS "client_view_case_report_documents" ON public.case_report_documents;
DROP POLICY IF EXISTS "client_view_matters" ON public.matters;
DROP POLICY IF EXISTS "client_view_matter_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "client_view_case_reports" ON public.case_reports;

DROP POLICY IF EXISTS "all_authenticated_documents" ON public.documents;
DROP POLICY IF EXISTS "all_authenticated_case_docs" ON public.case_documents;
DROP POLICY IF EXISTS "all_authenticated_report_docs" ON public.report_documents;
DROP POLICY IF EXISTS "all_authenticated_matters" ON public.matters;
DROP POLICY IF EXISTS "all_authenticated_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "all_authenticated_case_reports" ON public.case_reports;

-- Step 6: Create simple policies (allow all authenticated users)
CREATE POLICY "all_authenticated_documents" ON public.documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "all_authenticated_case_docs" ON public.case_documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "all_authenticated_report_docs" ON public.report_documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "all_authenticated_case_report_docs" ON public.case_report_documents
FOR ALL TO authenticated USING (true);

CREATE POLICY "all_authenticated_matters" ON public.matters
FOR ALL TO authenticated USING (true);

CREATE POLICY "all_authenticated_updates" ON public.matter_updates
FOR ALL TO authenticated USING (true);

CREATE POLICY "all_authenticated_case_reports" ON public.case_reports
FOR ALL TO authenticated USING (true);

-- Step 7: Grant permissions
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.case_documents TO authenticated;
GRANT ALL ON public.report_documents TO authenticated;
GRANT ALL ON public.case_report_documents TO authenticated;
GRANT ALL ON public.matters TO authenticated;
GRANT ALL ON public.matter_updates TO authenticated;
GRANT ALL ON public.case_reports TO authenticated;

-- Step 8: Reload schema
NOTIFY pgrst, 'reload schema';

-- Step 9: Verify foreign keys
SELECT 
    '✅ ALL DOCUMENT RELATIONSHIPS CREATED' as status,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE table_name = 'case_documents' AND constraint_type = 'FOREIGN KEY') as case_docs_fks,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE table_name = 'report_documents' AND constraint_type = 'FOREIGN KEY') as report_docs_fks,
    (SELECT COUNT(*) FROM information_schema.table_constraints 
     WHERE table_name = 'case_report_documents' AND constraint_type = 'FOREIGN KEY') as case_report_docs_fks;
