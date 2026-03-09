-- ==========================================
-- PHASE 3: DOCUMENT LIFECYCLE & E-SIGN
-- ==========================================

-- 1. Upgrade Documents Table for Versioning
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS version_major INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS version_minor INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_latest BOOLEAN DEFAULT TRUE;

-- 2. Add E-Sign Tracking
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS esign_status TEXT CHECK (esign_status IN ('not_sent', 'sent', 'viewed', 'partially_signed', 'completed', 'declined')),
ADD COLUMN IF NOT EXISTS esign_envelope_id TEXT, -- DocuSign/HelloSign ID
ADD COLUMN IF NOT EXISTS esign_completed_at TIMESTAMPTZ;

-- 3. Function to Create New Version
CREATE OR REPLACE FUNCTION public.create_document_version(
    p_parent_id UUID,
    p_filename TEXT,
    p_file_url TEXT,
    p_user_id UUID,
    p_role TEXT
)
RETURNS UUID AS $$
DECLARE
    new_doc_id UUID;
    parent_v_major INTEGER;
    parent_v_minor INTEGER;
BEGIN
    -- Get current version from parent
    SELECT version_major, version_minor INTO parent_v_major, parent_v_minor
    FROM public.documents WHERE id = p_parent_id;

    -- Update old 'latest' flag
    UPDATE public.documents SET is_latest = FALSE WHERE id = p_parent_id OR parent_document_id = p_parent_id;

    -- Insert new version
    INSERT INTO public.documents (
        filename, 
        file_url, 
        uploaded_by_user_id, 
        uploaded_by_role, 
        parent_document_id, 
        version_major, 
        version_minor,
        is_latest
    )
    VALUES (
        p_filename, 
        p_file_url, 
        p_user_id, 
        p_role, 
        p_parent_id, 
        parent_v_major, 
        parent_v_minor + 1,
        TRUE
    )
    RETURNING id INTO new_doc_id;

    RETURN new_doc_id;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Document Lifecycle and E-Sign Schema Initialized.' AS status;
