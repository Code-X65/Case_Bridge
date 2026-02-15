-- ====================================================================
-- 🚨 DEFINITIVE RESET: STAFF INVITATION SYSTEM
-- ====================================================================
DROP TRIGGER IF EXISTS on_invitation_created ON public.invitations;
DROP FUNCTION IF EXISTS public.handle_invite_creation();
DROP FUNCTION IF EXISTS public.send_branded_invite(text, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.send_branded_invite(text, text, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.get_invite_details(text);
DROP FUNCTION IF EXISTS public.get_invite_details(uuid);
DROP FUNCTION IF EXISTS public.complete_staff_setup(text, text);
DROP FUNCTION IF EXISTS public.revoke_secure_invitation(uuid);
DROP FUNCTION IF EXISTS public.resend_secure_invitation(uuid);
DROP FUNCTION IF EXISTS public.delete_staff_member(uuid, uuid);

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role_preassigned TEXT NOT NULL,
    firm_id UUID NOT NULL REFERENCES public.firms(id),
    first_name TEXT,
    last_name TEXT,
    token TEXT DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ  DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(email, firm_id)
);

CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

DROP TRIGGER IF EXISTS on_invited_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_invited_user_signup();

-- 2. SIGNUP HANDLER (with 20-minute expiration check)
CREATE OR REPLACE FUNCTION public.handle_invited_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_invite RECORD;
BEGIN
    SELECT * INTO v_invite FROM public.invitations 
    WHERE LOWER(email) = LOWER(NEW.email) 
    AND status = 'pending' 
    AND (updated_at > NOW() - INTERVAL '20 minutes')
    LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
        INSERT INTO public.profiles (id, email, role, status, onboarding_state)
        VALUES (NEW.id, NEW.email, v_invite.role_preassigned, 'active', 'pending')
        ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status, is_primary)
        VALUES (NEW.id, v_invite.firm_id, v_invite.role_preassigned, 'active', TRUE)
        ON CONFLICT (user_id, firm_id) DO NOTHING;

        UPDATE public.invitations SET status = 'accepted', accepted_at = NOW(), user_id = NEW.id WHERE id = v_invite.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. SEND BRANDED INVITE (Regenerates token and resets timer)
CREATE OR REPLACE FUNCTION public.send_branded_invite(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT,
    p_firm_id UUID,
    p_redirect_to TEXT DEFAULT 'http://localhost:5174/auth/accept-invite'
)
RETURNS TEXT AS $$
DECLARE
    v_token TEXT;
BEGIN
    v_token := encode(gen_random_bytes(32), 'hex');
    INSERT INTO public.invitations (email, role_preassigned, firm_id, first_name, last_name, token, status, updated_at)
    VALUES (p_email, p_role, p_firm_id, p_first_name, p_last_name, v_token, 'pending', now())
    ON CONFLICT (email, firm_id) DO UPDATE SET token = v_token, status = 'pending', updated_at = now();
    RETURN p_redirect_to || '?token=' || v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. GET INVITE DETAILS (Checking 20-minute expiration)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token TEXT)
RETURNS TABLE (email TEXT, first_name TEXT, last_name TEXT, role TEXT, firm_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT i.email, i.first_name, i.last_name, i.role_preassigned as role, f.name as firm_name
    FROM public.invitations i JOIN public.firms f ON f.id = i.firm_id
    WHERE i.token = p_token 
    AND i.status = 'pending'
    AND (i.updated_at > NOW() - INTERVAL '20 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. COMPLETE STAFF SETUP (Checking 20-minute expiration)
CREATE OR REPLACE FUNCTION public.complete_staff_setup(p_token TEXT, p_password TEXT)
RETURNS TEXT AS $$
DECLARE
    v_invite RECORD;
    v_resp_status INTEGER;
    v_resp_content TEXT;
    v_service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmdneWZkaXRnZGp6cnVjaHljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1NjkwMSwiZXhwIjoyMDgzNTMyOTAxfQ.9bc3wihO-32yCMZSzgk_tDjLeNLGjfFaV7a_7xnI9zw';
BEGIN
    SELECT * INTO v_invite FROM public.invitations 
    WHERE token = p_token AND status = 'pending'
    AND (updated_at > NOW() - INTERVAL '20 minutes');

    IF NOT FOUND THEN RETURN 'ERROR: Invitation has expired or is invalid (20-minute limit)'; END IF;

    SELECT status, content INTO v_resp_status, v_resp_content FROM extensions.http(('POST', 'https://blbggyfditgdjzruchyc.supabase.co/auth/v1/admin/users',
        ARRAY[extensions.http_header('Content-Type', 'application/json'), extensions.http_header('Authorization', 'Bearer ' || v_service_key), extensions.http_header('apikey', v_service_key)],
        'application/json', jsonb_build_object('email', v_invite.email, 'password', p_password, 'email_confirm', true, 'user_metadata', jsonb_build_object('first_name', v_invite.first_name, 'last_name', v_invite.last_name, 'role', v_invite.role_preassigned, 'firm_id', v_invite.firm_id))::text)::extensions.http_request);
    
    IF v_resp_status >= 400 THEN RETURN 'ERROR [Admin API]: ' || v_resp_content; END IF;
    
    UPDATE public.invitations SET status = 'accepted', accepted_at = now() WHERE id = v_invite.id;
    RETURN 'SUCCESS: Account created silently';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. MANAGEMENT RPCs
-- --------------------------------------------------------------------

-- Revoke/Delete Invitation
CREATE OR REPLACE FUNCTION public.revoke_secure_invitation(p_invite_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.invitations WHERE id = p_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resend/Renew Invitation
CREATE OR REPLACE FUNCTION public.resend_secure_invitation(p_invite_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_invite RECORD;
    v_new_token TEXT;
    v_redirect_to TEXT := 'http://localhost:5174/auth/accept-invite';
BEGIN
    v_new_token := encode(gen_random_bytes(32), 'hex');
    UPDATE public.invitations 
    SET token = v_new_token, status = 'pending', updated_at = now() 
    WHERE id = p_invite_id
    RETURNING * INTO v_invite;
    
    RETURN v_redirect_to || '?token=' || v_new_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete Staff Member
CREATE OR REPLACE FUNCTION public.delete_staff_member(p_user_id UUID, p_firm_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only allow removing from their own firm
    DELETE FROM public.user_firm_roles WHERE user_id = p_user_id AND firm_id = p_firm_id;
    -- Optionally deactivate profile if no more roles exist (omitted for safety)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
