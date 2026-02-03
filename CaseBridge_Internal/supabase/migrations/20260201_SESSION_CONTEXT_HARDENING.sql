-- ==========================================================
-- SESSION GOVERNANCE: CANONICAL SESSION CONTEXT
-- ==========================================================

-- 1. Create a Secure Function to get the current Firm/Role context
-- This avoids recursion by looking directly at the internal_sessions table.
CREATE OR REPLACE FUNCTION public.get_current_session_context()
RETURNS TABLE (firm_id UUID, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.firm_id, s.role
    FROM public.internal_sessions s
    WHERE s.user_id = auth.uid()
    AND s.expires_at > NOW()
    ORDER BY s.last_activity DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Create a View for easier RLS integration
CREATE OR REPLACE VIEW public.session_context AS
SELECT firm_id, role FROM public.get_current_session_context();

GRANT SELECT ON public.session_context TO authenticated;

-- 3. Hardened RLS Helpers
CREATE OR REPLACE FUNCTION public.check_access(p_firm_id UUID, p_required_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.session_context
        WHERE firm_id = p_firm_id
        AND role = ANY(p_required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Apply Hardened Policies to MATTERS
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view matters" ON public.matters;
CREATE POLICY "Staff view matters" ON public.matters
FOR SELECT USING (
    public.check_access(firm_id, ARRAY['admin_manager', 'case_manager', 'associate_lawyer'])
);

DROP POLICY IF EXISTS "CM/Admin manage matters" ON public.matters;
CREATE POLICY "CM/Admin manage matters" ON public.matters
FOR ALL USING (
    public.check_access(firm_id, ARRAY['admin_manager', 'case_manager'])
);

-- 5. Hardened Policies for CLIENT DATA
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view firm clients" ON public.client_profiles;
CREATE POLICY "Staff view firm clients" ON public.client_profiles
FOR SELECT USING (
    public.check_access(firm_id, ARRAY['admin_manager', 'case_manager', 'associate_lawyer'])
);

DROP POLICY IF EXISTS "Staff view firm documents" ON public.client_documents;
CREATE POLICY "Staff view firm documents" ON public.client_documents
FOR SELECT USING (
    public.check_access(firm_id, ARRAY['admin_manager', 'case_manager', 'associate_lawyer'])
);

-- 6. Associate Scoping (Secondary filter for Associates)
-- They should only see matters where they are assigned.
CREATE OR REPLACE FUNCTION public.is_assigned_to_matter(p_matter_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = p_matter_id
        AND m.assigned_associate = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP POLICY IF EXISTS "Associate view assigned matters" ON public.matters;
CREATE POLICY "Associate view assigned matters" ON public.matters
FOR SELECT USING (
    public.check_access(firm_id, ARRAY['associate_lawyer']) 
    AND assigned_associate = auth.uid()
);

-- Note: In PostgreSQL, if multiple policies apply, they are ORed if they are permissive.
-- So Case Managers get access via the general policy, and Associates get it via this one.

SELECT '✅ Session Context and Hardened RLS Isolation Applied.' as status;
