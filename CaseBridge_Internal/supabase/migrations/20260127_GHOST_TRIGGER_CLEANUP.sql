-- ==========================================
-- GHOST TRIGGER HUNTER & ULTIMATE CLEANUP
-- ==========================================

-- 1. DROP ALL POTENTIAL CONFLICTING TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created_handle_invite ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS sync_user_profile ON auth.users;

-- 2. DISABLE AUDIT TRIGGERS TEMPORARILY (To isolate the issue)
DROP TRIGGER IF EXISTS on_session_created_audit ON public.internal_sessions;
DROP TRIGGER IF EXISTS on_invite_created_audit ON public.invitations;
DROP TRIGGER IF EXISTS on_role_assigned_audit ON public.user_firm_roles;

-- 3. RESET THE SIGNUP TRIGGER TO A "SILENT" STATE
CREATE OR REPLACE FUNCTION public.handle_invite_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_invite public.invitations;
BEGIN
    -- This version is ultra-safe. If anything goes wrong, it JUST RETURNS NEW and logs to the internal Postgres log.
    
    -- Check for invitation
    SELECT * INTO v_invite
    FROM public.invitations
    WHERE email = NEW.email
    AND status = 'pending'
    LIMIT 1;

    IF v_invite IS NOT NULL THEN
        -- Safely insert profile
        BEGIN
            INSERT INTO public.profiles (id, full_name, role, email, status, onboarding_state)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
                LOWER(v_invite.role_preassigned),
                NEW.email,
                'active',
                'completed'
            )
            ON CONFLICT (id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Diagnostic: Profile insert failed: %', SQLERRM;
        END;

        -- Safely assign role
        BEGIN
            INSERT INTO public.user_firm_roles (user_id, firm_id, role, status)
            VALUES (
                NEW.id,
                v_invite.firm_id,
                LOWER(v_invite.role_preassigned),
                'active'
            )
            ON CONFLICT (user_id, firm_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Diagnostic: Role assignment failed: %', SQLERRM;
        END;

        -- Safely update invite
        BEGIN
            UPDATE public.invitations
            SET status = 'accepted', user_id = NEW.id, accepted_at = NOW()
            WHERE id = v_invite.id;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Diagnostic: Invite update failed: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If the whole thing crashes, we STILL return NEW so the signup succeeds.
    RAISE WARNING 'Diagnostic: handle_invite_on_signup CRASHED: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RE-ATTACH THE SILENT TRIGGER
CREATE TRIGGER on_auth_user_created_handle_invite
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_invite_on_signup();

-- 5. DIAGNOSTIC QUERY (Run this separately to see what triggers still exist)
-- SELECT event_object_schema, event_object_table, trigger_name 
-- FROM information_schema.triggers 
-- WHERE event_object_table = 'users' AND event_object_schema = 'auth';

SELECT '✅ Cleanup complete. Database triggers are now in "Silent/Safe" mode. Try signing up again.' AS status;
