-- ==========================================================
-- HOTFIX: Create signature_requests table (standalone)
-- Run this if 20260307_ESIGNATURE_WORKFLOW.sql wasn't applied
-- ==========================================================

-- 1. Create the table (idempotent)
CREATE TABLE IF NOT EXISTS public.signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID,
    matter_id UUID,
    requested_by UUID,
    client_id UUID,
    firm_id UUID,
    status TEXT DEFAULT 'pending',
    signature_data TEXT,
    signed_at TIMESTAMPTZ,
    message TEXT,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add any missing columns (if table existed with fewer columns)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signature_requests' AND column_name='firm_id') THEN
        ALTER TABLE public.signature_requests ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signature_requests' AND column_name='signature_data') THEN
        ALTER TABLE public.signature_requests ADD COLUMN signature_data TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signature_requests' AND column_name='signed_at') THEN
        ALTER TABLE public.signature_requests ADD COLUMN signed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signature_requests' AND column_name='message') THEN
        ALTER TABLE public.signature_requests ADD COLUMN message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signature_requests' AND column_name='expires_at') THEN
        ALTER TABLE public.signature_requests ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signature_requests' AND column_name='client_id') THEN
        ALTER TABLE public.signature_requests ADD COLUMN client_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='signature_requests' AND column_name='requested_by') THEN
        ALTER TABLE public.signature_requests ADD COLUMN requested_by UUID;
    END IF;
END $$;

-- 3. Enable RLS with open access for authenticated users
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_signature_requests" ON public.signature_requests;
CREATE POLICY "open_signature_requests" ON public.signature_requests
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON public.signature_requests TO authenticated;

-- 4. Force schema reload
NOTIFY pgrst, 'reload schema';
SELECT '✅ signature_requests table is ready' AS status;
