-- Add name fields to invitations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='first_name') THEN
        ALTER TABLE public.invitations ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='invitations' AND column_name='last_name') THEN
        ALTER TABLE public.invitations ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- Update Create Invitation RPC
CREATE OR REPLACE FUNCTION public.create_secure_invitation(
    p_email TEXT, 
    p_role TEXT, 
    p_firm_id UUID,
    p_first_name TEXT DEFAULT NULL,
    p_last_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_token UUID;
BEGIN
    -- Authorization Check
    IF NOT public.i_am_admin(p_firm_id) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
    
    v_token := gen_random_uuid();
    
    INSERT INTO public.invitations (
        firm_id, email, role_preassigned, token, status, invited_by, expires_at, first_name, last_name
    )
    VALUES (
        p_firm_id, p_email, p_role, v_token, 'pending', auth.uid(), NOW() + INTERVAL '72 hours', p_first_name, p_last_name
    );
    
    INSERT INTO public.audit_logs (actor_id, firm_id, action, metadata)
    VALUES (
        auth.uid(), 
        p_firm_id, 
        'staff_invited', 
        jsonb_build_object('email', p_email, 'role', p_role, 'first_name', p_first_name, 'last_name', p_last_name)
    );
    
    RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Signup Trigger to use Names
CREATE OR REPLACE FUNCTION public.handle_invited_signup() RETURNS TRIGGER AS $$
DECLARE v_invite RECORD;
BEGIN
    SELECT * INTO v_invite FROM public.invitations WHERE email = NEW.email AND status = 'pending' LIMIT 1;
    
    IF v_invite.id IS NOT NULL THEN
        -- Create Profile with Full Name from Invite if available
        INSERT INTO public.profiles (id, email, full_name, role, status, onboarding_state, first_login_flag)
        VALUES (
            NEW.id, 
            NEW.email, 
            TRIM(COALESCE(v_invite.first_name, '') || ' ' || COALESCE(v_invite.last_name, '')), -- Construct Full Name
            v_invite.role_preassigned, 
            'active', 
            'pending', 
            TRUE
        );
        
        -- Create Firm Role Link
        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status, is_primary)
        VALUES (NEW.id, v_invite.firm_id, v_invite.role_preassigned, 'active', TRUE);
        
        -- Mark Accepted
        UPDATE public.invitations SET status = 'accepted', accepted_at = NOW(), user_id = NEW.id WHERE id = v_invite.id;
        
        -- Audit
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id) VALUES (NEW.id, v_invite.firm_id, 'staff_accepted_invite', NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Invitation System Updated with Names' as status;
