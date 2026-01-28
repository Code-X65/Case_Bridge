-- ==========================================
-- FINAL STAFF INVITE & GOVERNANCE SYSTEM
-- ==========================================

-- 1. STABLE HELPERS (Security Definer to prevent recursion)
CREATE OR REPLACE FUNCTION public.get_my_firms()
RETURNS TABLE (f_id UUID) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.i_am_admin(p_firm_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() AND firm_id = p_firm_id AND role = 'admin_manager'
    );
$$;

-- 2. AUDIT LOGS (Canonical Schema)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES auth.users(id),
    firm_id UUID REFERENCES public.firms(id),
    action TEXT NOT NULL,
    target_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON public.audit_logs FOR SELECT USING (firm_id IN (SELECT f_id FROM public.get_my_firms()));

-- 3. INVITATION RPCs (Secure Backend Control)
CREATE OR REPLACE FUNCTION public.create_secure_invitation(p_email TEXT, p_role TEXT, p_firm_id UUID)
RETURNS UUID AS $$
DECLARE v_token UUID;
BEGIN
    IF NOT public.i_am_admin(p_firm_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    v_token := gen_random_uuid();
    INSERT INTO public.invitations (firm_id, email, role_preassigned, token, status, invited_by, expires_at)
    VALUES (p_firm_id, p_email, p_role, v_token, 'pending', auth.uid(), NOW() + INTERVAL '72 hours');
    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (auth.uid(), p_firm_id, 'staff_invited', jsonb_build_object('email', p_email, 'role', p_role));
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.resend_secure_invitation(p_invite_id UUID)
RETURNS UUID AS $$
DECLARE v_new_token UUID; v_invite RECORD;
BEGIN
    SELECT * INTO v_invite FROM public.invitations WHERE id = p_invite_id;
    IF NOT public.i_am_admin(v_invite.firm_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    v_new_token := gen_random_uuid();
    UPDATE public.invitations SET token = v_new_token, expires_at = NOW() + INTERVAL '72 hours', status = 'pending', created_at = NOW() WHERE id = p_invite_id;
    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (auth.uid(), v_invite.firm_id, 'staff_invite_resent', jsonb_build_object('email', v_invite.email));
    RETURN v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ACCEPT JOURNEY (Details & Auto-Bind)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token UUID)
RETURNS TABLE (email TEXT, firm_name TEXT, role TEXT) AS $$
    SELECT i.email, f.name, i.role_preassigned
    FROM public.invitations i JOIN public.firms f ON i.firm_id = f.id
    WHERE i.token = p_token AND i.status = 'pending' AND i.expires_at > NOW();
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_invited_signup() RETURNS TRIGGER AS $$
DECLARE v_invite RECORD;
BEGIN
    SELECT * INTO v_invite FROM public.invitations WHERE email = NEW.email AND status = 'pending' LIMIT 1;
    IF v_invite.id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, role, status, onboarding_state, first_login_flag)
        VALUES (NEW.id, NEW.email, v_invite.role_preassigned, 'active', 'pending', TRUE);
        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status, is_primary)
        VALUES (NEW.id, v_invite.firm_id, v_invite.role_preassigned, 'active', TRUE);
        UPDATE public.invitations SET status = 'accepted', accepted_at = NOW(), user_id = NEW.id WHERE id = v_invite.id;
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id) VALUES (NEW.id, v_invite.firm_id, 'staff_accepted_invite', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_invited_signup ON auth.users;
CREATE TRIGGER on_invited_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_invited_signup();

SELECT '✅ Staff Invite system fully active and live.' AS status;
