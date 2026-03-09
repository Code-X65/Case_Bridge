-- ==========================================
-- END-TO-END ENCRYPTION (E2EE) SCHEMA
-- ==========================================

-- 1. Create matter_keys table
-- Stores the encrypted Matter Key (MK) for each matter
-- In a full implementation, this key is encrypted with each participant's Public Key (ECC)
-- For this Phase 2 implementation, we store a base-key that staff can access via RLS
CREATE TABLE IF NOT EXISTS public.matter_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL, -- The AES-256 key for the matter, encrypted for the firm
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(matter_id)
);

-- 2. Enable RLS
ALTER TABLE public.matter_keys ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policy: Only staff assigned to the matter can access the key
CREATE POLICY "Staff access matter keys" ON public.matter_keys
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.matters 
        WHERE id = public.matter_keys.matter_id 
        AND (assigned_associate = auth.uid() OR assigned_case_manager = auth.uid() OR firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'admin_manager')))
    )
);

-- 4. Add 'is_encrypted' flag to relevant tables
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_comments' AND column_name='is_encrypted') THEN
        ALTER TABLE public.case_comments ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matter_communications' AND column_name='is_encrypted') THEN
        ALTER TABLE public.matter_communications ADD COLUMN is_encrypted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

SELECT '✅ E2EE Schema Initialized.' AS status;
