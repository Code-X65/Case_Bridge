-- ==========================================================
-- FIX: Add missing columns to documents table
-- Needed for DocumentVault and eSignature features
-- ==========================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='esign_status') THEN
        ALTER TABLE public.documents ADD COLUMN esign_status TEXT DEFAULT 'not_sent';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='esign_envelope_id') THEN
        ALTER TABLE public.documents ADD COLUMN esign_envelope_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='version_major') THEN
        ALTER TABLE public.documents ADD COLUMN version_major INT DEFAULT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='version_minor') THEN
        ALTER TABLE public.documents ADD COLUMN version_minor INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='is_latest') THEN
        ALTER TABLE public.documents ADD COLUMN is_latest BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='parent_document_id') THEN
        ALTER TABLE public.documents ADD COLUMN parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;
    END IF;

    -- uploaded_by_role may also be missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='uploaded_by_role') THEN
        ALTER TABLE public.documents ADD COLUMN uploaded_by_role TEXT;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
SELECT '✅ documents table columns fully aligned' AS status;
