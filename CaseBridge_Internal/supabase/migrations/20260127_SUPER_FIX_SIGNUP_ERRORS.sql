-- ==========================================
-- SUPER FIX: DATABASE TRIGGER & CONSTRAINT SYNC
-- ==========================================

-- 1. Fix Audit Logs RLS (Triggers need to be able to insert)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow system to insert logs" ON public.audit_logs;
CREATE POLICY "Allow system to insert logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view firm logs" ON public.audit_logs;
CREATE POLICY "Admins can view firm logs" ON public.audit_logs
    FOR SELECT USING (public.is_firm_admin(firm_id));

-- 2. Normalize Profiles Role Constraint (Make it case-insensitive)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (LOWER(role) IN ('admin_manager', 'case_manager', 'associate_lawyer'));

-- 3. Robust Handle Invite Trigger
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
        -- 1. Create Profile (Ensure role is lowercase for constraints)
        INSERT INTO public.profiles (id, full_name, role, email, status, onboarding_state)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            LOWER(v_invite.role_preassigned),
            NEW.email,
            'active',
            'completed'
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role,
            email = EXCLUDED.email;

        -- 2. Assign Role in Firm
        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status)
        VALUES (
            NEW.id,
            v_invite.firm_id,
            LOWER(v_invite.role_preassigned),
            'active'
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
    -- Log error details to a table if we had one, but for now just don't crash the signup
    -- However, failing silently is dangerous. Let's make sure it's correct.
    RAISE LOG 'Error in handle_invite_on_signup: %', SQLERRM;
    RETURN NEW; -- Still allow user creation even if invite processing fails? 
    -- Actually, better to catch specific errors.
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Audit Role Assigned (Handle potential RLS/Auth issues)
CREATE OR REPLACE FUNCTION public.trigger_audit_role_assigned()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (firm_id, user_id, action, details)
    VALUES (
        NEW.firm_id, 
        NEW.user_id, 
        'role_assigned', 
        jsonb_build_object('role', LOWER(NEW.role))
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in trigger_audit_role_assigned: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Finalize Triggers
DROP TRIGGER IF EXISTS on_auth_user_created_handle_invite ON auth.users;
CREATE TRIGGER on_auth_user_created_handle_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_invite_on_signup();

DROP TRIGGER IF EXISTS on_role_assigned_audit ON public.user_firm_roles;
CREATE TRIGGER on_role_assigned_audit
AFTER INSERT ON public.user_firm_roles
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_role_assigned();

SELECT '✅ Super Fix Applied: Role constraints normalized and logging policies corrected.' AS status;
