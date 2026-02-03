-- ==========================================
-- CLIENT VAULT & GLOBAL DOCUMENTS V1
-- ==========================================

-- 1. Add Category to Client Documents for better organization
ALTER TABLE public.client_documents 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General' 
CHECK (category IN ('Identity', 'Financial', 'Evidence', 'Corporate', 'General'));

-- 2. Ensure RLS for deletion (Clients should be able to manage their vault)
DROP POLICY IF EXISTS "Clients delete own documents" ON public.client_documents;
CREATE POLICY "Clients delete own documents" 
ON public.client_documents 
FOR DELETE 
USING (
    client_id = auth.uid()
);

-- 3. Add Update policy for category/filename changes
DROP POLICY IF EXISTS "Clients update own documents" ON public.client_documents;
CREATE POLICY "Clients update own documents" 
ON public.client_documents 
FOR UPDATE 
USING (
    client_id = auth.uid()
);

-- 4. RPC to Log Activity for Vault Actions
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

SELECT '✅ Client Vault schema updates applied.' as status;
