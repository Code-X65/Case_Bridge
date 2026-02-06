-- ==========================================
-- CASEBRIDGE FINAL INTEGRITY SCHEMA V12
-- ==========================================

-- 1. CLEANUP (Safe reset of log/intake tables)
DROP TABLE IF EXISTS public.case_assignments CASCADE;
DROP TABLE IF EXISTS public.report_documents CASCADE;
DROP TABLE IF EXISTS public.matter_updates CASCADE;
DROP TABLE IF EXISTS public.case_meetings CASCADE;
DROP TABLE IF EXISTS public.case_report_documents CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.matters CASCADE;
DROP TABLE IF EXISTS public.case_reports CASCADE;

-- 2. CORE IDENTITY
CREATE TABLE IF NOT EXISTS public.external_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVOICES & BILLING
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.external_users(id), -- Points to profile
    firm_id UUID REFERENCES public.firms(id),
    plan_type TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    invoice_number TEXT,
    status TEXT DEFAULT 'draft',
    paystack_reference TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- 4. CASE REPORTS (Intake)
CREATE TABLE public.case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.external_users(id) ON DELETE CASCADE, -- FIXED: Points to profile for joins
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    jurisdiction TEXT,
    status TEXT DEFAULT 'submitted',
    preferred_firm_id UUID REFERENCES public.firms(id),
    invoice_id UUID REFERENCES public.invoices(id),
    intake_plan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CASE REPORT DOCUMENTS
CREATE TABLE public.case_report_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_report_id UUID REFERENCES public.case_reports(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MATTERS (Workspace)
CREATE TABLE public.matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.external_users(id) ON DELETE SET NULL, -- FIXED: Points to profile for joins
    case_report_id UUID UNIQUE REFERENCES public.case_reports(id),
    matter_number TEXT UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    internal_notes TEXT,
    lifecycle_state TEXT DEFAULT 'submitted',
    priority TEXT DEFAULT 'medium',
    assigned_associate UUID REFERENCES public.profiles(id),
    assigned_case_manager UUID REFERENCES public.profiles(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. CASE ASSIGNMENTS
CREATE TABLE public.case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    target_type TEXT DEFAULT 'matter',
    assigned_to_user_id UUID REFERENCES auth.users(id),
    assigned_role TEXT,
    firm_id UUID REFERENCES public.firms(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROGRESS UPDATES
CREATE TABLE public.matter_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id),
    author_role TEXT,
    title TEXT NOT NULL,
    content TEXT,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SECURITY POLICIES
ALTER TABLE public.case_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- Staff Policies
CREATE POLICY "staff_reports" ON public.case_reports FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_docs" ON public.case_report_documents FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_matters" ON public.matters FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_updates" ON public.matter_updates FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_assignments" ON public.case_assignments FOR ALL TO authenticated USING (public.is_staff());

-- Client Policies
CREATE POLICY "client_reports" ON public.case_reports FOR ALL TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "client_docs" ON public.case_report_documents FOR ALL TO authenticated 
    USING (EXISTS (SELECT 1 FROM public.case_reports WHERE id = case_report_id AND client_id = auth.uid()));
CREATE POLICY "client_invoices" ON public.invoices FOR ALL TO authenticated USING (auth.uid() = client_id);

-- 10. GRANTS & NUMBERING
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

CREATE SEQUENCE IF NOT EXISTS public.matter_number_seq;
CREATE OR REPLACE FUNCTION public.gen_matter_no() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.matter_number IS NULL THEN
        NEW.matter_number := 'MAT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('public.matter_number_seq')::TEXT, 4, '0');
    END IF; RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_mat_no BEFORE INSERT ON public.matters FOR EACH ROW EXECUTE FUNCTION public.gen_matter_no();

NOTIFY pgrst, 'reload schema';
SELECT '✅ V12: UI Join Conflicts Resolved & Missing Tables Restored' as status;
