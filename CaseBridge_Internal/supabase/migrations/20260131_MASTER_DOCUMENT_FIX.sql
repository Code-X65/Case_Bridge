-- ============================================
-- MASTER DOCUMENT SYSTEM & VAULT INITIALIZATION
-- ============================================

-- 1. Ensure Client Profiles exists
CREATE TABLE IF NOT EXISTS public.client_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) NOT NULL,
    full_name TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create/Ensure Client Documents Table (The Vault)
CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) NOT NULL,
    client_id UUID REFERENCES public.client_profiles(id) NOT NULL,
    matter_id UUID REFERENCES public.matters(id), -- Optional link to matter
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    category TEXT DEFAULT 'General' CHECK (category IN ('Identity', 'Financial', 'Evidence', 'Corporate', 'General')),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR VAULT

-- Select
DROP POLICY IF EXISTS "Clients view own documents" ON public.client_documents;
CREATE POLICY "Clients view own documents" ON public.client_documents 
FOR SELECT USING (client_id = auth.uid());

-- Insert
DROP POLICY IF EXISTS "Clients upload own documents" ON public.client_documents;
CREATE POLICY "Clients upload own documents" ON public.client_documents 
FOR INSERT WITH CHECK (client_id = auth.uid());

-- Update
DROP POLICY IF EXISTS "Clients update own documents" ON public.client_documents;
CREATE POLICY "Clients update own documents" ON public.client_documents 
FOR UPDATE USING (client_id = auth.uid());

-- Delete
DROP POLICY IF EXISTS "Clients delete own documents" ON public.client_documents;
CREATE POLICY "Clients delete own documents" ON public.client_documents 
FOR DELETE USING (client_id = auth.uid());

-- 5. STAFF ACCESS (For viewing vault docs attached to matters)
DROP POLICY IF EXISTS "Staff view firm client documents" ON public.client_documents;
CREATE POLICY "Staff view firm client documents" ON public.client_documents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = client_documents.firm_id 
        AND status = 'active'
    )
);

-- 6. VAULT UTILITIES (RPCs)
CREATE OR REPLACE FUNCTION public.track_vault_activity(
    p_action TEXT,
    p_target_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    SELECT 
        auth.uid(), 
        cp.firm_id, 
        p_action, 
        p_target_id, 
        p_metadata
    FROM public.client_profiles cp
    WHERE cp.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Master Document System & Vault Initialized Successfully.' as status;
