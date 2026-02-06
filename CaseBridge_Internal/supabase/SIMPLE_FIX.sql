-- ==========================================
-- SIMPLE FIX - NO POLICIES YET
-- Just create tables and add columns
-- ==========================================

-- STEP 1: Add type column to notifications
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN type TEXT;
        
        -- Set default for existing rows
        UPDATE public.notifications SET type = 'general' WHERE type IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE public.notifications 
        ALTER COLUMN type SET NOT NULL;
    END IF;
END $$;

-- STEP 2: Ensure documents table exists
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL,
    uploaded_by_user_id UUID,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add uploaded_by_role if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'documents' 
        AND column_name = 'uploaded_by_role'
    ) THEN
        ALTER TABLE public.documents ADD COLUMN uploaded_by_role TEXT;
    END IF;
END $$;

-- STEP 3: Ensure matter_updates exists
CREATE TABLE IF NOT EXISTS public.matter_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID,
    author_id UUID,
    author_role TEXT,
    title TEXT NOT NULL,
    content TEXT,
    client_visible BOOLEAN DEFAULT TRUE,
    is_final BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 4: Create case_documents (no foreign keys yet)
CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 5: Create report_documents (no foreign keys yet)
CREATE TABLE IF NOT EXISTS public.report_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 6: Enable RLS but with simple policies
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "staff_manage_documents" ON public.documents;
DROP POLICY IF EXISTS "staff_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "staff_manage_case_docs" ON public.case_documents;
DROP POLICY IF EXISTS "staff_manage_report_docs" ON public.report_documents;

-- Create simple staff-only policies for now
CREATE POLICY "staff_manage_documents" ON public.documents
FOR ALL TO authenticated
USING (public.is_staff());

CREATE POLICY "staff_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

CREATE POLICY "staff_manage_case_docs" ON public.case_documents
FOR ALL TO authenticated
USING (public.is_staff());

CREATE POLICY "staff_manage_report_docs" ON public.report_documents
FOR ALL TO authenticated
USING (public.is_staff());

-- STEP 7: Grants
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.matter_updates TO authenticated;
GRANT ALL ON public.case_documents TO authenticated;
GRANT ALL ON public.report_documents TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Basic tables created. Staff can now:
- Submit progress reports
- Upload documents
- Create cases with notifications
Client policies will be added in next step.' as status;
