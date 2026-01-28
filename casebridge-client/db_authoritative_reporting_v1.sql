-- ========================================================
-- CANONICAL CASE REPORTING & ASSIGNMENT SCHEMA V1
-- ========================================================

-- 1. Enum for Intake/Matter Status (Consolidated)
DO $$ BEGIN
    CREATE TYPE public.case_status AS ENUM ('submitted', 'under_review', 'in_progress', 'closed', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Case Reports (Intake Layer)
CREATE TABLE IF NOT EXISTS public.case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.external_users(id),
    preferred_firm_id UUID REFERENCES public.firms(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    jurisdiction TEXT,
    status public.case_status DEFAULT 'submitted',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Case Assignments (Assignment Layer)
-- Tracks who is responsible for a case/matter.
-- Can link to a Report (Intake Phase) or Matter (Active Phase)
CREATE TABLE IF NOT EXISTS public.case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL, -- UUID of case_report or matter
    target_type TEXT NOT NULL CHECK (target_type IN ('case_report', 'matter')),
    assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id),
    assigned_role TEXT NOT NULL CHECK (assigned_role IN ('case_manager', 'associate_lawyer')),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(target_id, assigned_to_user_id, assigned_role)
);

-- 4. Matters (Execution Layer)
CREATE TABLE IF NOT EXISTS public.matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID NOT NULL REFERENCES public.firms(id),
    client_id UUID NOT NULL REFERENCES public.external_users(id),
    case_report_id UUID UNIQUE REFERENCES public.case_reports(id),
    title TEXT NOT NULL,
    description TEXT,
    lifecycle_state public.case_status DEFAULT 'submitted',
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Audit Events (Unified logging)
CREATE OR REPLACE FUNCTION public.emit_case_event(
    p_action TEXT,
    p_target_id UUID,
    p_firm_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (auth.uid(), p_firm_id, p_action, p_target_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES (AUTHORITATIVE)

ALTER TABLE public.case_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

-- Case Reports: Client visibility
DROP POLICY IF EXISTS "Clients view own reports" ON public.case_reports;
CREATE POLICY "Clients view own reports" 
ON public.case_reports FOR SELECT 
USING (client_id = auth.uid()); -- auth.uid() matches external_users(id) in our dual-auth model

-- Case Reports: Admin/CM visibility
DROP POLICY IF EXISTS "Admin/CM view firm reports" ON public.case_reports;
CREATE POLICY "Admin/CM view firm reports" 
ON public.case_reports FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
        AND (case_reports.preferred_firm_id = ufr.firm_id OR case_reports.preferred_firm_id IS NULL)
    )
);

-- Case Reports: Forbidden for Associate Lawyers unless assigned (though prompt says they only see Matters)
-- Prompt says: "Associate Lawyers see ONLY cases explicitly assigned to them"
CREATE POLICY "Associates view assigned reports"
ON public.case_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.target_id = case_reports.id
        AND ca.target_type = 'case_report'
        AND ca.assigned_to_user_id = auth.uid()
    )
);

-- Matters: Visibility Matrix
DROP POLICY IF EXISTS "Matters - Admin/CM Visibility" ON public.matters;
CREATE POLICY "Matters - Admin/CM Visibility"
ON public.matters FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.firm_id = matters.firm_id
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
    )
);

DROP POLICY IF EXISTS "Matters - Associate Visibility" ON public.matters;
CREATE POLICY "Matters - Associate Visibility"
ON public.matters FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.target_id = matters.id
        AND ca.target_type = 'matter'
        AND ca.assigned_to_user_id = auth.uid()
    )
);

-- 7. Automated Triggers

-- client_case_report_submitted
CREATE OR REPLACE FUNCTION public.on_case_report_submitted()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.emit_case_event('client_case_report_submitted', NEW.id, NEW.preferred_firm_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_client_report_submitted ON public.case_reports;
CREATE TRIGGER trg_client_report_submitted
AFTER INSERT ON public.case_reports
FOR EACH ROW EXECUTE FUNCTION public.on_case_report_submitted();

-- case_assigned
CREATE OR REPLACE FUNCTION public.on_case_assigned()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.emit_case_event('case_assigned', NEW.target_id, NULL, jsonb_build_object('assignee', NEW.assigned_to_user_id, 'role', NEW.assigned_role));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_case_assigned ON public.case_assignments;
CREATE TRIGGER trg_case_assigned
AFTER INSERT ON public.case_assignments
FOR EACH ROW EXECUTE FUNCTION public.on_case_assigned();

SELECT '✅ Canonical V1 Schema (End-to-End) Applied' AS status;
