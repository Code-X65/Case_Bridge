-- ==========================================
-- UNIFIED FOUNDATION & GOVERNANCE SYSTEM
-- ==========================================

-- 1. DROP EVERYTHING EXPERIMENTAL TO START CLEAN
DROP FUNCTION IF EXISTS public.is_firm_admin(UUID);
DROP FUNCTION IF EXISTS public.get_my_firms();
DROP FUNCTION IF EXISTS public.i_am_admin(UUID);
DROP FUNCTION IF EXISTS public.check_user_firm_access(UUID);
DROP FUNCTION IF EXISTS public.check_user_is_admin(UUID);

-- 2. CREATE STABLE SECURITY DEFINER HELPERS
-- These are necessary for non-recursive RLS and governance logic.
CREATE OR REPLACE FUNCTION public.get_my_firms()
RETURNS TABLE (f_id UUID) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid();
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
    );
$$;

-- 3. AUDIT LOGS (Canonical Schema)
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

-- Enable RLS and apply flat policies
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON public.audit_logs FOR SELECT USING (firm_id IN (SELECT f_id FROM public.get_my_firms()));

-- 4. SECURE INVITATION RPC
CREATE OR REPLACE FUNCTION public.create_secure_invitation(
    p_email TEXT,
    p_role TEXT,
    p_firm_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_token UUID;
BEGIN
    IF NOT public.i_am_admin(p_firm_id) THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can invite staff.';
    END IF;

    v_token := gen_random_uuid();
    INSERT INTO public.invitations (
        firm_id, email, role_preassigned, token, status, invited_by, expires_at
    ) VALUES (
        p_firm_id, p_email, p_role, v_token, 'pending', auth.uid(), NOW() + INTERVAL '72 hours'
    );

    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (auth.uid(), p_firm_id, 'staff_invited', jsonb_build_object(
        'email', p_email, 'role', p_role, 'firm_id', p_firm_id
    ));

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. RESEND INVITE RPC
CREATE OR REPLACE FUNCTION public.resend_secure_invitation(p_invite_id UUID)
RETURNS UUID AS $$
DECLARE
    v_new_token UUID;
    v_invite RECORD;
BEGIN
    SELECT * INTO v_invite FROM public.invitations WHERE id = p_invite_id;
    IF NOT public.i_am_admin(v_invite.firm_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    v_new_token := gen_random_uuid();
    UPDATE public.invitations SET token = v_new_token, expires_at = NOW() + INTERVAL '72 hours', status = 'pending', created_at = NOW()
    WHERE id = p_invite_id;

    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (auth.uid(), v_invite.firm_id, 'staff_invite_resent', jsonb_build_object(
        'email', v_invite.email, 'invite_id', p_invite_id
    ));

    RETURN v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Super-Governance System Enabled with all dependencies.' AS status;
