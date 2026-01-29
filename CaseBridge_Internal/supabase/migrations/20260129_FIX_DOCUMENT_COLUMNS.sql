-- ==========================================
-- FINAL SCHEMA FIX: CASE REPORT DOCUMENTS
-- ==========================================
-- Adds missing columns used by triggers and UI to case_report_documents table.

-- 1. Add missing columns
ALTER TABLE public.case_report_documents 
    ADD COLUMN IF NOT EXISTS is_client_visible BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES public.firms(id);

-- 2. Update existing records (link to firm via case_report)
UPDATE public.case_report_documents 
SET firm_id = cr.preferred_firm_id
FROM public.case_reports cr
WHERE cr.id = case_report_documents.case_report_id
AND case_report_documents.firm_id IS NULL;

-- 3. Update the emit_document_upload trigger function to be robust
CREATE OR REPLACE FUNCTION public.emit_document_upload() RETURNS TRIGGER AS $$
DECLARE
    v_cr RECORD;
    v_uploader_role TEXT;
    v_is_client BOOLEAN;
BEGIN
    SELECT * INTO v_cr FROM public.case_reports WHERE id = NEW.case_report_id;
    
    -- Determine role
    v_is_client := (auth.uid() = v_cr.client_id);
    v_uploader_role := CASE WHEN v_is_client THEN 'client' ELSE 'staff' END;

    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (
        auth.uid(),
        COALESCE(NEW.firm_id, v_cr.preferred_firm_id),
        'document_uploaded',
        NEW.id,
        jsonb_build_object(
            'case_id', NEW.case_report_id,
            'title', NEW.file_name,
            'uploader_role', v_uploader_role,
            -- Safe access with COALESCE or just NEW.is_client_visible since we added it
            'is_client_visible', COALESCE(NEW.is_client_visible, TRUE)
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ case_report_documents schema updated and trigger fixed' as status;
