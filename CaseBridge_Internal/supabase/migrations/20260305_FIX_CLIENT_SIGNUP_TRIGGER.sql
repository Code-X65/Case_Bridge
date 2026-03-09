-- ==========================================
-- FIX: CLIENT SIGNUP TRIGGER - 500 ERROR
-- ==========================================
-- Root Cause:
-- The `handle_new_client_oauth` trigger (from 20260305_CLIENT_AUTH.sql) fires 
-- on every auth.users INSERT and queries `matters.raw_client_data` and
-- `matters.client_id` — NEITHER of these columns exist. 
-- This crashes the trigger, rolls back the transaction, and Supabase returns
-- a 500 Internal Server Error to the client making signup impossible.
--
-- Fix:
-- 1. Replace handle_new_client_oauth with a safe, no-op version.
--    The external_users trigger (handle_new_external_user) already handles 
--    creating the correct client record, so the OAuth trigger is redundant.
-- 2. Ensure external_users status column supports 'registered'/'verified'
--    statuses so Login.tsx status checks work correctly.
-- ==========================================

-- 1. FIX THE BROKEN TRIGGER FUNCTION
-- Replace with a safe version that does NOT reference non-existent columns.
-- The handle_new_external_user trigger already creates external_users records,
-- so this function only needs to be a safety no-op for internal users.
CREATE OR REPLACE FUNCTION public.handle_new_client_oauth()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if NOT an internal staff user (not in profiles table)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- The actual external_users record creation is handled by
    -- handle_new_external_user trigger. This function is now a safe no-op
    -- to prevent conflicts with the OAuth flow.
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Never crash a signup due to this trigger
    RAISE LOG 'handle_new_client_oauth: non-fatal error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ALSO HARDEN handle_new_external_user TO NEVER CRASH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_external_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if not an internal user (not in profiles table)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.external_users (
            id, 
            email, 
            first_name, 
            last_name, 
            phone, 
            country,
            status
        )
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'country',
            'registered'  -- New clients start as 'registered' pending email verification
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            country = EXCLUDED.country,
            updated_at = NOW();
    END IF;
    RETURN NEW;

EXCEPTION WHEN OTHERS THEN
    -- Never crash a signup due to this trigger
    RAISE LOG 'handle_new_external_user: non-fatal error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ALSO HARDEN handle_invite_on_signup TO NEVER CRASH CLIENT SIGNUP
-- (already has exception handling but let's make sure it's solid)
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
    RAISE LOG 'handle_invite_on_signup: non-fatal error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. UPDATE external_users STATUS ENUM TO SUPPORT CLIENT LIFECYCLE
-- The Login.tsx checks for 'registered', 'verified', 'active' statuses
-- but the old constraint only allowed 'active', 'suspended', 'deleted'
ALTER TABLE public.external_users 
DROP CONSTRAINT IF EXISTS external_users_status_check;

ALTER TABLE public.external_users 
ADD CONSTRAINT external_users_status_check 
CHECK (status IN ('registered', 'verified', 'active', 'suspended', 'deleted'));

-- 5. Add INSERT RLS policy so the trigger (SECURITY DEFINER) can insert
-- Note: SECURITY DEFINER functions bypass RLS, but let's add a policy
-- just in case anon/authenticated roles need to insert their own record.
DROP POLICY IF EXISTS "Users can insert own external profile" ON public.external_users;
CREATE POLICY "Users can insert own external profile"
ON public.external_users FOR INSERT
WITH CHECK (id = auth.uid());

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT '✅ Client signup trigger fixed. 500 error on signup should be resolved.' AS status;
