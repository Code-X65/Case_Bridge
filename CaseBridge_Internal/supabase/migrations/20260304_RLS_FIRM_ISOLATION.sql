-- ==========================================
-- PHASE 4: UNIFIED FIRM ISOLATION (RLS)
-- Standardizes tenant isolation across all tables.
-- ==========================================

-- 1. DROP OLD TRUTH FUNCTIONS
DROP FUNCTION IF EXISTS public.get_my_firms() CASCADE;
DROP FUNCTION IF EXISTS public.i_am_admin(UUID) CASCADE;

-- 2. CREATE ACCESS HELPERS (SECURITY DEFINER)
-- Standardizing on has_firm_access but keeping others for backward compatibility.

CREATE OR REPLACE FUNCTION public.get_my_firms()
RETURNS TABLE (f_id UUID) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION public.has_firm_access(p_firm_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = p_firm_id 
        AND status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.i_am_admin(p_firm_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = p_firm_id 
        AND role = 'admin_manager'
        AND status = 'active'
    );
$$;

-- 3. APPLY TO CORE TABLES

-- MATTERS
DROP POLICY IF EXISTS "Admins and CMs view firm matters" ON public.matters;
DROP POLICY IF EXISTS "Associates view assigned matters" ON public.matters;
DROP POLICY IF EXISTS "CM create matters" ON public.matters;
DROP POLICY IF EXISTS "CM update matters" ON public.matters;
DROP POLICY IF EXISTS "firm_isolation_matters" ON public.matters;

CREATE POLICY "firm_isolation_matters" ON public.matters
FOR ALL TO authenticated USING (has_firm_access(firm_id));

-- DOCUMENTS
-- Governed by junction tables OR ownership.
DROP POLICY IF EXISTS "firm_access_documents" ON public.documents;
DROP POLICY IF EXISTS "firm_isolation_documents" ON public.documents;
CREATE POLICY "firm_isolation_documents" ON public.documents
FOR ALL TO authenticated USING (
    uploaded_by_user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.case_documents cd
        JOIN public.matters m ON cd.matter_id = m.id
        WHERE cd.document_id = documents.id
        AND has_firm_access(m.firm_id)
    )
    OR EXISTS (
        SELECT 1 FROM public.report_documents rd
        JOIN public.matter_updates mu ON rd.report_id = mu.id
        JOIN public.matters m ON mu.matter_id = m.id
        WHERE rd.document_id = documents.id
        AND has_firm_access(m.firm_id)
    )
);

-- MATTER UPDATES
DROP POLICY IF EXISTS "staff_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "firm_isolation_updates" ON public.matter_updates;
CREATE POLICY "firm_isolation_updates" ON public.matter_updates
FOR ALL TO authenticated USING (
    matter_id IN (SELECT id FROM public.matters WHERE has_firm_access(firm_id))
);

-- TRUST LEDGER
DROP POLICY IF EXISTS "firm_access_trust_ledger" ON public.trust_ledger_entries;
DROP POLICY IF EXISTS "firm_isolation_trust_ledger" ON public.trust_ledger_entries;
CREATE POLICY "firm_isolation_trust_ledger" ON public.trust_ledger_entries
FOR ALL TO authenticated USING (has_firm_access(firm_id));

-- CASE PIPELINES
DROP POLICY IF EXISTS "firm_access_pipelines" ON public.practice_pipelines;
DROP POLICY IF EXISTS "firm_isolation_pipelines" ON public.practice_pipelines;
CREATE POLICY "firm_isolation_pipelines" ON public.practice_pipelines
FOR ALL TO authenticated USING (has_firm_access(firm_id));

-- JUNCTION TABLES ISOLATION
DROP POLICY IF EXISTS "firm_access_case_docs" ON public.case_documents; -- Old policy name
DROP POLICY IF EXISTS "firm_isolation_case_docs" ON public.case_documents;
CREATE POLICY "firm_isolation_case_docs" ON public.case_documents
FOR ALL TO authenticated USING (matter_id IN (SELECT id FROM public.matters WHERE has_firm_access(firm_id)));

DROP POLICY IF EXISTS "firm_isolation_report_docs" ON public.report_documents;
CREATE POLICY "firm_isolation_report_docs" ON public.report_documents
FOR ALL TO authenticated USING (
    report_id IN (SELECT id FROM public.matter_updates WHERE matter_id IN (SELECT id FROM public.matters WHERE has_firm_access(firm_id)))
);

DROP POLICY IF EXISTS "Unified Document Visibility" ON public.case_report_documents;
DROP POLICY IF EXISTS "firm_isolation_case_report_docs" ON public.case_report_documents;
CREATE POLICY "firm_isolation_case_report_docs" ON public.case_report_documents
FOR ALL TO authenticated USING (has_firm_access(firm_id));

-- COURT DOCKETS & FILINGS
DROP POLICY IF EXISTS "firm_access_dockets" ON public.court_dockets;
DROP POLICY IF EXISTS "firm_isolation_dockets" ON public.court_dockets;
CREATE POLICY "firm_isolation_dockets" ON public.court_dockets
FOR ALL TO authenticated USING (
    matter_id IN (SELECT id FROM public.matters WHERE has_firm_access(firm_id))
);

DROP POLICY IF EXISTS "firm_access_filings" ON public.docket_filings;
DROP POLICY IF EXISTS "firm_isolation_filings" ON public.docket_filings;
CREATE POLICY "firm_isolation_filings" ON public.docket_filings
FOR ALL TO authenticated USING (
    docket_id IN (SELECT id FROM public.court_dockets WHERE matter_id IN (SELECT id FROM public.matters WHERE has_firm_access(firm_id)))
);

-- INVITATIONS
DROP POLICY IF EXISTS "inv_manage" ON public.invitations;
DROP POLICY IF EXISTS "inv_read" ON public.invitations;
DROP POLICY IF EXISTS "firm_isolation_invitations" ON public.invitations;
CREATE POLICY "firm_isolation_invitations" ON public.invitations
FOR ALL TO authenticated USING (has_firm_access(firm_id));

-- AUDIT LOGS
DROP POLICY IF EXISTS "audit_read" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view firm audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "firm_isolation_audit_logs" ON public.audit_logs;
CREATE POLICY "firm_isolation_audit_logs" ON public.audit_logs
FOR SELECT TO authenticated USING (has_firm_access(firm_id));

-- PROFILES (Staff Directory)
DROP POLICY IF EXISTS "profiles_read" ON public.profiles;
DROP POLICY IF EXISTS "firm_isolation_profiles" ON public.profiles;
CREATE POLICY "firm_isolation_profiles" ON public.profiles
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = profiles.id 
        AND has_firm_access(firm_id)
    )
);

-- ROLES
DROP POLICY IF EXISTS "firm_isolation_roles" ON public.user_firm_roles;
CREATE POLICY "firm_isolation_roles" ON public.user_firm_roles
FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR has_firm_access(firm_id)
);

SELECT '✅ Unified Firm Isolation Pattern Applied Successfully.' AS status;
