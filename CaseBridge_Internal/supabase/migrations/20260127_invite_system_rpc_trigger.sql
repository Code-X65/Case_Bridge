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
