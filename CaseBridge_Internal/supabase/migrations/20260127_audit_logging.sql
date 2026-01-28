-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Only Admins can view logs for their firm
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view firm logs" ON public.audit_logs;
CREATE POLICY "Admins can view firm logs" ON public.audit_logs
    FOR SELECT
    USING (public.is_firm_admin(firm_id));

-- Trigger Function: Log Login (Session)
CREATE OR REPLACE FUNCTION public.trigger_audit_login()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (firm_id, user_id, action, details)
    VALUES (NEW.firm_id, NEW.user_id, 'login', jsonb_build_object('session_id', NEW.id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_session_created_audit ON public.internal_sessions;
CREATE TRIGGER on_session_created_audit
AFTER INSERT ON public.internal_sessions
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_login();

-- Trigger Function: Log User Invite
CREATE OR REPLACE FUNCTION public.trigger_audit_invite()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (firm_id, user_id, action, details)
    VALUES (
        NEW.firm_id, 
        auth.uid(), -- The actor (admin) who created the invite
        'user_invited', 
        jsonb_build_object('invited_email', NEW.email, 'role', NEW.role_preassigned)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invite_created_audit ON public.invitations;
CREATE TRIGGER on_invite_created_audit
AFTER INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_invite();

-- Trigger Function: Log Role Assignment (User Joined)
CREATE OR REPLACE FUNCTION public.trigger_audit_role_assigned()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (firm_id, user_id, action, details)
    VALUES (
        NEW.firm_id, 
        NEW.user_id, 
        'role_assigned', 
        jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_role_assigned_audit ON public.user_firm_roles;
CREATE TRIGGER on_role_assigned_audit
AFTER INSERT ON public.user_firm_roles
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_role_assigned();

SELECT '✅ Audit logging system setup completed.' AS status;
