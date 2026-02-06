-- ==========================================
-- COMPLETE FIX FOR ALL CURRENT ISSUES
-- ==========================================

-- ==========================================
-- STEP 1: Fix notifications table
-- ==========================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'general';
        
        ALTER TABLE public.notifications 
        ALTER COLUMN type DROP DEFAULT;
    END IF;
END $$;

-- ==========================================
-- STEP 2: Create/verify all tables first
-- ==========================================

-- Ensure documents table exists with all columns
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by_user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by_role') THEN
        ALTER TABLE public.documents ADD COLUMN uploaded_by_role TEXT;
    END IF;
END $$;

-- Ensure matter_updates table exists
CREATE TABLE IF NOT EXISTS public.matter_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    author_role TEXT,
    title TEXT NOT NULL,
    content TEXT,
    client_visible BOOLEAN DEFAULT TRUE,
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create case_documents table
CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create report_documents table
CREATE TABLE IF NOT EXISTS public.report_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID REFERENCES public.matter_updates(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- STEP 3: Enable RLS on all tables
-- ==========================================
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 4: Drop existing policies
-- ==========================================
DROP POLICY IF EXISTS "staff_manage_case_docs" ON public.case_documents;
DROP POLICY IF EXISTS "clients_view_own_case_docs" ON public.case_documents;
DROP POLICY IF EXISTS "staff_manage_report_docs" ON public.report_documents;
DROP POLICY IF EXISTS "clients_view_report_docs" ON public.report_documents;
DROP POLICY IF EXISTS "staff_manage_documents" ON public.documents;
DROP POLICY IF EXISTS "clients_view_documents" ON public.documents;
DROP POLICY IF EXISTS "staff_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "clients_view_updates" ON public.matter_updates;

-- ==========================================
-- STEP 5: Create RLS policies
-- ==========================================

-- case_documents policies
CREATE POLICY "staff_manage_case_docs" ON public.case_documents
FOR ALL TO authenticated
USING (public.is_staff());

CREATE POLICY "clients_view_own_case_docs" ON public.case_documents
FOR SELECT TO authenticated
USING (
    client_visible = TRUE
    AND EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = matter_id
        AND m.client_id = auth.uid()
    )
);

-- report_documents policies
CREATE POLICY "staff_manage_report_docs" ON public.report_documents
FOR ALL TO authenticated
USING (public.is_staff());

CREATE POLICY "clients_view_report_docs" ON public.report_documents
FOR SELECT TO authenticated
USING (
    client_visible = TRUE
    AND EXISTS (
        SELECT 1 FROM public.matter_updates mu
        JOIN public.matters m ON m.id = mu.matter_id
        WHERE mu.id = report_id
        AND m.client_id = auth.uid()
        AND mu.client_visible = TRUE
    )
);

-- documents table policies
CREATE POLICY "staff_manage_documents" ON public.documents
FOR ALL TO authenticated
USING (public.is_staff());

CREATE POLICY "clients_view_documents" ON public.documents
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.case_documents cd
        JOIN public.matters m ON m.id = cd.matter_id
        WHERE cd.document_id = documents.id
        AND m.client_id = auth.uid()
        AND cd.client_visible = TRUE
    )
    OR EXISTS (
        SELECT 1 FROM public.report_documents rd
        JOIN public.matter_updates mu ON mu.id = rd.report_id
        JOIN public.matters m ON m.id = mu.matter_id
        WHERE rd.document_id = documents.id
        AND m.client_id = auth.uid()
        AND rd.client_visible = TRUE
        AND mu.client_visible = TRUE
    )
);

-- matter_updates policies
CREATE POLICY "staff_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "clients_view_updates" ON public.matter_updates
FOR SELECT TO authenticated
USING (
    client_visible = TRUE
    AND EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = matter_id
        AND m.client_id = auth.uid()
    )
);

-- ==========================================
-- STEP 6: Grants
-- ==========================================
GRANT ALL ON public.case_documents TO authenticated;
GRANT ALL ON public.report_documents TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.matter_updates TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ All issues fixed:
- notifications.type column added
- case_documents table created
- report_documents table verified
- documents.uploaded_by_role added
- matter_updates table verified
- All RLS policies configured
- Client document access enabled' as status;
