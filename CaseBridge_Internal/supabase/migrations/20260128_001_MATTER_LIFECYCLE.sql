-- 1. Create Matter Status Enum
CREATE TYPE public.matter_status AS ENUM (
    'draft', 
    'pending_review', 
    'active', 
    'on_hold', 
    'closed'
);

-- 2. Create Matters Table
CREATE TABLE public.matters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status public.matter_status DEFAULT 'draft',
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    assigned_case_manager UUID REFERENCES public.profiles(id),
    assigned_associate UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Admin & Case Manager: View ALL firm matters
CREATE POLICY "Admins and CMs view firm matters" 
ON public.matters 
FOR SELECT 
USING (
    exists (
        select 1 from public.session_context 
        where firm_id = matters.firm_id 
        and role IN ('admin', 'admin_manager', 'case_manager')
    )
);

-- Associate: View ASSIGNED matters only
CREATE POLICY "Associates view assigned matters" 
ON public.matters 
FOR SELECT 
USING (
    exists (
        select 1 from public.session_context 
        where firm_id = matters.firm_id 
        and role IN ('associate', 'associate_lawyer')
        and matters.assigned_associate = auth.uid()
    )
);

-- Case Manager: INSERT matters (Firm Scoped)
CREATE POLICY "CM create matters" 
ON public.matters 
FOR INSERT 
WITH CHECK (
    exists (
        select 1 from public.session_context 
        where firm_id = matters.firm_id 
        and role = 'case_manager'
    )
    AND created_by = auth.uid()
);

-- Case Manager: UPDATE matters (Firm Scoped)
CREATE POLICY "CM update matters" 
ON public.matters 
FOR UPDATE 
USING (
    exists (
        select 1 from public.session_context 
        where firm_id = matters.firm_id 
        and role = 'case_manager'
    )
);

-- 5. Audit Logging Trigger for Matters
CREATE OR REPLACE FUNCTION public.audit_matter_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (
            auth.uid(), 
            NEW.firm_id, 
            'matter_created', 
            NEW.id, 
            jsonb_build_object('title', NEW.title)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (NEW.assigned_associate IS DISTINCT FROM OLD.assigned_associate) THEN
            INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
            VALUES (
                auth.uid(), 
                NEW.firm_id, 
                'associate_assigned', 
                NEW.id, 
                jsonb_build_object('new_associate', NEW.assigned_associate, 'old_associate', OLD.assigned_associate)
            );
        END IF;
        
        IF (NEW.status IS DISTINCT FROM OLD.status) THEN
             INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
            VALUES (
                auth.uid(), 
                NEW.firm_id, 
                'matter_status_changed', 
                NEW.id, 
                jsonb_build_object('new_status', NEW.status, 'old_status', OLD.status)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER matter_audit_trigger
AFTER INSERT OR UPDATE ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.audit_matter_changes();

-- Helper to ensure session context is available (from previous context, assuming session_context view or function exists, 
-- but given the prompt's strict governance, we rely on RLS. 
-- Using a simpler RLS checking approach if session_context isn't fully robust yet, 
-- essentially checking user_firm_roles directly or via auth.uid())

-- IMPROVED RLS using direct tables to be safe if session_context is complex:

DROP POLICY IF EXISTS "Admins and CMs view firm matters" ON public.matters;
DROP POLICY IF EXISTS "Associates view assigned matters" ON public.matters;
DROP POLICY IF EXISTS "CM create matters" ON public.matters;
DROP POLICY IF EXISTS "CM update matters" ON public.matters;

CREATE POLICY "Admins and CMs view firm matters" 
ON public.matters 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND role IN ('admin', 'admin_manager', 'case_manager')
        AND status = 'active'
    )
);

CREATE POLICY "Associates view assigned matters" 
ON public.matters 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND role IN ('associate', 'associate_lawyer')
        AND status = 'active'
    )
    AND
    matters.assigned_associate = auth.uid()
);

CREATE POLICY "CM create matters" 
ON public.matters 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND role = 'case_manager'
        AND status = 'active'
    )
);

CREATE POLICY "CM update matters" 
ON public.matters 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = matters.firm_id 
        AND role = 'case_manager'
        AND status = 'active'
    )
);
