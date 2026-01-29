-- ==========================================================
-- FIX: STORE NAMES IN INVITATIONS & PROPAGATE TO PROFILE
-- ==========================================================

-- 1. Ensure columns exist in invitations
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS last_name TEXT;

-- 2. Update the RPC to accept and store names
-- Drop old signature first to be safe if arguments change count
DROP FUNCTION IF EXISTS public.create_secure_invitation(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.create_secure_invitation(
    p_email TEXT, 
    p_role TEXT, 
    p_firm_id UUID,
    p_first_name TEXT DEFAULT '',
    p_last_name TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE v_token UUID;
BEGIN
    IF NOT public.i_am_admin(p_firm_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    
    v_token := gen_random_uuid();
    
    INSERT INTO public.invitations (
        firm_id, 
        email, 
        role_preassigned, 
        first_name, 
        last_name, 
        token, 
        status, 
        invited_by, 
        expires_at
    )
    VALUES (
        p_firm_id, 
        LOWER(p_email), 
        p_role, 
        p_first_name, 
        p_last_name, 
        v_token, 
        'pending', 
        auth.uid(), 
        NOW() + INTERVAL '72 hours'
    );

    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (
        auth.uid(), 
        p_firm_id, 
        'staff_invited', 
        jsonb_build_object('email', LOWER(p_email), 'role', p_role, 'name', p_first_name || ' ' || p_last_name)
    );

    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update Trigger to use these names
CREATE OR REPLACE FUNCTION public.handle_invite_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_invite public.invitations;
    v_full_name TEXT;
BEGIN
    -- Match email securely and case-insensitively
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE LOWER(email) = LOWER(NEW.email)
    AND status = 'pending'
    LIMIT 1;

    IF v_invite.id IS NOT NULL THEN
        
        -- Determine Full Name (Prefer invite names, fallback to metadata)
        v_full_name := COALESCE(v_invite.first_name, '') || ' ' || COALESCE(v_invite.last_name, '');
        IF TRIM(v_full_name) = '' THEN
             v_full_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '');
        END IF;

        -- 1. Create Profile
        INSERT INTO public.profiles (id, full_name, role, email, status, onboarding_state, first_login_flag)
        VALUES (
            NEW.id,
            TRIM(v_full_name),
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

        -- 3. Update Invitation status
        UPDATE public.invitations
        SET status = 'accepted',
            user_id = NEW.id,
            accepted_at = NOW()
        WHERE id = v_invite.id;
        
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_invite_on_signup: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Fixed names in invitations and profile creation.' as status;
