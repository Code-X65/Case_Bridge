-- ==========================================
-- ACCEPT INVITE: BACKEND LOGIC
-- ==========================================

-- 1. RPC: Fetch Invite Details safely (Public but token-guarded)
CREATE OR REPLACE FUNCTION public.get_invite_details(p_token UUID)
RETURNS TABLE (
    email TEXT,
    firm_name TEXT,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.email,
        f.name as firm_name,
        i.role_preassigned as role
    FROM public.invitations i
    JOIN public.firms f ON i.firm_id = f.id
    WHERE i.token = p_token
    AND i.status = 'pending'
    AND i.expires_at > NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. TRIGGER: Auto-bind user on signup
-- When a user signs up, if they have a pending invite, automatically:
-- a) Create their profile
-- b) Bind them to the firm
-- c) Mark the invite as accepted
CREATE OR REPLACE FUNCTION public.handle_invited_user_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_invite RECORD;
BEGIN
    -- Look for a pending invitation for this email
    SELECT * INTO v_invite 
    FROM public.invitations 
    WHERE email = NEW.email 
    AND status = 'pending' 
    LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
        -- 1. Create Profile
        INSERT INTO public.profiles (
            id,
            email,
            role,
            status,
            onboarding_state,
            first_login_flag
        ) VALUES (
            NEW.id,
            NEW.email,
            v_invite.role_preassigned,
            'active',
            'pending',
            TRUE
        );

        -- 2. Bind to Firm
        INSERT INTO public.user_firm_roles (
            user_id,
            firm_id,
            role,
            status,
            is_primary
        ) VALUES (
            NEW.id,
            v_invite.firm_id,
            v_invite.role_preassigned,
            'active',
            TRUE
        );

        -- 3. Mark Invite Accepted
        UPDATE public.invitations
        SET 
            status = 'accepted',
            accepted_at = NOW(),
            user_id = NEW.id
        WHERE id = v_invite.id;

        -- 4. Audit Log
        INSERT INTO public.audit_logs (actor_id, action, target_id, metadata)
        VALUES (NEW.id, 'staff_accepted_invite', NEW.id, jsonb_build_object(
            'email', NEW.email,
            'firm_id', v_invite.firm_id,
            'role', v_invite.role_preassigned
        ));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Trigger to auth.users (Standard Supabase Auth Flow)
DROP TRIGGER IF EXISTS on_invited_auth_user_created ON auth.users;
CREATE TRIGGER on_invited_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_invited_user_signup();

SELECT '✅ Accept Invite logic and auto-bind trigger enabled.' AS status;
