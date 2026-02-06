-- ==========================================
-- NON-DESTRUCTIVE: ADD MISSING COLUMNS ONLY
-- ==========================================
-- This script ONLY adds missing columns without dropping any tables

-- Add missing columns to case_report_documents if they don't exist
DO $$ 
BEGIN
    -- Add firm_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_report_documents' 
        AND column_name = 'firm_id'
    ) THEN
        ALTER TABLE public.case_report_documents 
        ADD COLUMN firm_id UUID REFERENCES public.firms(id);
    END IF;

    -- Add is_client_visible column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_report_documents' 
        AND column_name = 'is_client_visible'
    ) THEN
        ALTER TABLE public.case_report_documents 
        ADD COLUMN is_client_visible BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Ensure RLS policies allow client document uploads
DROP POLICY IF EXISTS "client_upload_docs" ON public.case_report_documents;
CREATE POLICY "client_upload_docs" ON public.case_report_documents 
FOR INSERT TO authenticated 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.case_reports 
        WHERE id = case_report_id 
        AND client_id = auth.uid()
    )
);

-- Ensure staff can view all documents
DROP POLICY IF EXISTS "staff_view_docs" ON public.case_report_documents;
CREATE POLICY "staff_view_docs" ON public.case_report_documents 
FOR SELECT TO authenticated 
USING (public.is_staff());

NOTIFY pgrst, 'reload schema';
SELECT '✅ Missing columns added to case_report_documents' as status;
