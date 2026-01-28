-- RPC to validate invite token and get details (Accessible by Anon)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token UUID)
RETURNS TABLE (
    email TEXT,
    firm_name TEXT,
    role TEXT
) AS $$
DECLARE
    v_invite public.invitations;
    v_firm_name TEXT;
BEGIN
    -- Select invitation if valid and not expired
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

    IF v_invite IS NULL THEN
        RETURN;
    END IF;

    -- Get firm name
    SELECT name INTO v_firm_name
    FROM public.firms
    WHERE id = v_invite.firm_id;

    RETURN QUERY SELECT v_invite.email, v_firm_name, v_invite.role_preassigned;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_invite_details(UUID) TO anon, authenticated;


-- Trigger Function to auto-assign roles on Signup if Invite exists
CREATE OR REPLACE FUNCTION public.handle_invite_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_invite public.invitations;
BEGIN
    -- Check for pending invitation by email
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE email = NEW.email
    AND status = 'pending'
    LIMIT 1;

    IF v_invite IS NOT NULL THEN
        -- 1. Create Profile
        INSERT INTO public.profiles (id, full_name, role, email, status, onboarding_state)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            v_invite.role_preassigned,
            NEW.email,
            'active',
            'completed' -- Skip onboarding for invited staff? Or maybe 'pending'
        )
        ON CONFLICT (id) DO NOTHING;

        -- 2. Assign Role in Firm
        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status)
        VALUES (
            NEW.id,
            v_invite.firm_id,
            v_invite.role_preassigned,
            'active'
        );

        -- 3. Update Invitation status
        UPDATE public.invitations
        SET status = 'accepted',
            user_id = NEW.id,
            accepted_at = NOW()
        WHERE id = v_invite.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_handle_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_handle_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_invite_on_signup();
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
