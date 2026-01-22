-- ============================================================================
-- AUTO-SAVE COURT REPORT ATTACHMENTS TO CLIENT DOCUMENT VAULT
-- ============================================================================
-- This migration creates a trigger that automatically saves any document
-- uploaded in a court report to the client's document vault.
-- ============================================================================

-- ============================================================================
-- 1. FUNCTION TO COPY COURT REPORT ATTACHMENT TO CLIENT DOCUMENTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.copy_court_report_attachment_to_client_vault()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_matter RECORD;
    v_court_report RECORD;
    v_client_id UUID;
    v_uploaded_by UUID;
    v_document_id UUID;
BEGIN
    -- Get court report details
    SELECT * INTO v_court_report
    FROM public.court_reports
    WHERE id = NEW.court_report_id;
    
    IF NOT FOUND THEN
        RAISE WARNING 'Court report not found: %', NEW.court_report_id;
        RETURN NEW;
    END IF;
    
    -- Get matter details including client_id
    SELECT * INTO v_matter
    FROM public.matters
    WHERE id = v_court_report.matter_id;
    
    IF NOT FOUND THEN
        RAISE WARNING 'Matter not found: %', v_court_report.matter_id;
        RETURN NEW;
    END IF;
    
    -- Get client_id from matter
    v_client_id := v_matter.client_id;
    
    IF v_client_id IS NULL THEN
        RAISE WARNING 'Matter % has no client assigned', v_matter.id;
        RETURN NEW;
    END IF;
    
    -- Get who uploaded the court report (associate lawyer)
    v_uploaded_by := v_court_report.submitted_by;
    
    -- Insert into documents table (client's document vault)
    INSERT INTO public.documents (
        matter_id,
        client_id,
        file_name,
        file_path,
        file_size,
        file_type,
        uploaded_by,
        document_category,
        description,
        metadata
    ) VALUES (
        v_matter.id,
        v_client_id,
        NEW.file_name,
        NEW.file_path, -- Same storage path
        NEW.file_size,
        NEW.file_type,
        v_uploaded_by,
        'court_report', -- Category to identify it came from court report
        'Automatically saved from Court Report #' || v_court_report.id,
        jsonb_build_object(
            'source', 'court_report',
            'court_report_id', v_court_report.id,
            'court_report_attachment_id', NEW.id,
            'auto_saved', true,
            'saved_at', NOW()
        )
    )
    RETURNING id INTO v_document_id;
    
    -- Log the action
    INSERT INTO public.case_logs (
        matter_id,
        action,
        details,
        performed_by
    ) VALUES (
        v_matter.id,
        'document_auto_saved',
        jsonb_build_object(
            'document_id', v_document_id,
            'file_name', NEW.file_name,
            'source', 'court_report_attachment',
            'court_report_id', v_court_report.id
        ),
        v_uploaded_by
    );
    
    RAISE NOTICE 'Court report attachment % copied to client vault as document %', NEW.id, v_document_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the court report attachment insert
        RAISE WARNING 'Failed to copy court report attachment to client vault: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- ============================================================================
-- 2. CREATE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_copy_court_report_attachment_to_vault ON public.court_report_attachments;

CREATE TRIGGER trigger_copy_court_report_attachment_to_vault
AFTER INSERT ON public.court_report_attachments
FOR EACH ROW
EXECUTE FUNCTION public.copy_court_report_attachment_to_client_vault();

-- ============================================================================
-- 3. ADD DOCUMENT_CATEGORY COLUMN IF NOT EXISTS
-- ============================================================================

-- Add document_category column to documents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'document_category'
    ) THEN
        ALTER TABLE public.documents
        ADD COLUMN document_category TEXT DEFAULT 'general';
        
        -- Add check constraint for valid categories
        ALTER TABLE public.documents
        ADD CONSTRAINT documents_category_check
        CHECK (document_category IN (
            'general',
            'court_report',
            'evidence',
            'contract',
            'correspondence',
            'filing',
            'other'
        ));
    END IF;
END $$;

-- ============================================================================
-- 4. ADD CLIENT_ID COLUMN TO DOCUMENTS IF NOT EXISTS
-- ============================================================================

-- Ensure documents table has client_id column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'client_id'
    ) THEN
        ALTER TABLE public.documents
        ADD COLUMN client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_documents_client_id ON public.documents(client_id);
    END IF;
END $$;

-- ============================================================================
-- 5. ADD DESCRIPTION COLUMN TO DOCUMENTS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.documents
        ADD COLUMN description TEXT;
    END IF;
END $$;

-- ============================================================================
-- 6. ADD METADATA COLUMN TO DOCUMENTS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.documents
        ADD COLUMN metadata JSONB DEFAULT '{}';
        
        -- Create GIN index for JSONB queries
        CREATE INDEX IF NOT EXISTS idx_documents_metadata ON public.documents USING GIN (metadata);
    END IF;
END $$;

-- ============================================================================
-- 7. ADD UPLOADED_BY COLUMN TO DOCUMENTS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'documents'
        AND column_name = 'uploaded_by'
    ) THEN
        ALTER TABLE public.documents
        ADD COLUMN uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
    END IF;
END $$;

-- ============================================================================
-- 8. UPDATE RLS POLICIES FOR DOCUMENTS (IF NEEDED)
-- ============================================================================

-- Ensure clients can view their own documents
DROP POLICY IF EXISTS "Clients can view their documents" ON public.documents;
CREATE POLICY "Clients can view their documents"
ON public.documents FOR SELECT
USING (
    client_id = auth.uid()
    OR
    -- Also allow if matter is assigned to them
    matter_id IN (
        SELECT id FROM public.matters
        WHERE client_id = auth.uid()
    )
);

-- Ensure internal users can view documents for their firm's cases
DROP POLICY IF EXISTS "Internal users can view firm documents" ON public.documents;
CREATE POLICY "Internal users can view firm documents"
ON public.documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matters m
        INNER JOIN public.profiles p ON p.firm_id = m.firm_id
        WHERE m.id = documents.matter_id
        AND p.id = auth.uid()
        AND p.status = 'active'
    )
);

-- ============================================================================
-- 9. CREATE VIEW FOR CLIENT DOCUMENT VAULT
-- ============================================================================

CREATE OR REPLACE VIEW public.client_document_vault AS
SELECT 
    d.*,
    m.title as matter_title,
    m.matter_number,
    p.first_name || ' ' || p.last_name as uploaded_by_name,
    CASE 
        WHEN d.metadata->>'source' = 'court_report' THEN 'Court Report'
        ELSE 'Direct Upload'
    END as source_type
FROM public.documents d
LEFT JOIN public.matters m ON m.id = d.matter_id
LEFT JOIN public.profiles p ON p.id = d.uploaded_by
WHERE d.client_id = auth.uid()
ORDER BY d.created_at DESC;

-- ============================================================================
-- SCHEMA REFRESH
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the setup)
-- ============================================================================

-- 1. Check if trigger exists
-- SELECT tgname, tgenabled 
-- FROM pg_trigger 
-- WHERE tgname = 'trigger_copy_court_report_attachment_to_vault';

-- 2. Check if columns were added
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'documents' 
-- AND column_name IN ('client_id', 'document_category', 'description', 'metadata');

-- 3. Test the trigger (replace with actual IDs)
-- INSERT INTO court_report_attachments (court_report_id, file_name, file_path, file_size, file_type)
-- VALUES ('your-court-report-id', 'test.pdf', 'test/path.pdf', 1024, 'application/pdf');

-- 4. Check if document was created
-- SELECT * FROM documents WHERE metadata->>'source' = 'court_report' ORDER BY created_at DESC LIMIT 5;

-- 5. View client document vault
-- SELECT * FROM client_document_vault LIMIT 10;
