-- ==========================================================
-- FIX INVITE & SIGNUP TRIGGER RELIABILITY (2026-01-29)
-- ==========================================================

-- 1. Ensure invitations store lowercase emails to match Auth
UPDATE public.invitations SET email = LOWER(email);

-- 2. Update the Create Invite RPC to enforce lowercase
CREATE OR REPLACE FUNCTION public.create_secure_invitation(p_email TEXT, p_role TEXT, p_firm_id UUID)
RETURNS UUID AS $$
DECLARE v_token UUID;
BEGIN
    IF NOT public.i_am_admin(p_firm_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    v_token := gen_random_uuid();
    INSERT INTO public.invitations (firm_id, email, role_preassigned, token, status, invited_by, expires_at)
    VALUES (p_firm_id, LOWER(p_email), p_role, v_token, 'pending', auth.uid(), NOW() + INTERVAL '72 hours');
    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (auth.uid(), p_firm_id, 'staff_invited', jsonb_build_object('email', LOWER(p_email), 'role', p_role));
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. FIX THE SIGNUP TRIGGER (Case Insensitive Matching + Logging)
CREATE OR REPLACE FUNCTION public.handle_invite_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_invite public.invitations;
BEGIN
    -- Match email securely and case-insensitively
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
        -- 1. Create Profile
        INSERT INTO public.profiles (id, full_name, role, email, status, onboarding_state, first_login_flag)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            LOWER(v_invite.role_preassigned),
            NEW.email,
            'active',
            'completed',
            TRUE
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            email = EXCLUDED.email;

        -- 2. Assign Role in Firm
        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status, is_primary)
        VALUES (
            NEW.id,
            v_invite.firm_id,
            LOWER(v_invite.role_preassigned),
            'active',
            TRUE
        )
        ON CONFLICT (user_id, firm_id) DO UPDATE SET
            role = EXCLUDED.role;

        -- 3. Audit Log (Before update to avoid constraint issues?)
        -- Trigger on user_firm_roles handles audit, so we skip explicit audit here
         
        -- 4. Update Invitation status
        UPDATE public.invitations
        SET status = 'accepted',
            user_id = NEW.id,
            accepted_at = NOW()
        WHERE id = v_invite.id;
        
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but allow user creation to proceed (prevents blocking signup due to trigger bugs)
    -- Ideally we write to a system log table if available
    RAISE LOG 'Error in handle_invite_on_signup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_handle_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_handle_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_invite_on_signup();

-- Also ensure the OTHER older trigger is dropped if it existed with a different name
DROP TRIGGER IF EXISTS on_invited_signup ON auth.users;

SELECT '✅ Fix applied: Invite triggers are now case-insensitive.' as status;
