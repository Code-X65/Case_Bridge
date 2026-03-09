-- ==========================================
-- AUTHENTICATION HARDENING: ACCOUNT LOCKOUT
-- ==========================================

-- 1. ADD COLUMNS TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS failed_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;

-- 2. CREATE HANDLER FOR FAILED LOGIN
-- This uses SECURITY DEFINER to update profile status from the front-end RPC.
CREATE OR REPLACE FUNCTION public.handle_failed_auth(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_profile_id UUID;
    v_attempts INT;
BEGIN
    -- Find profile by email
    SELECT id, failed_attempts INTO v_profile_id, v_attempts
    FROM public.profiles
    WHERE email = p_email;

    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('status', 'not_found');
    END IF;

    -- Increment attempts
    v_attempts := v_attempts + 1;

    -- Update profile
    IF v_attempts >= 5 THEN
        UPDATE public.profiles 
        SET 
            failed_attempts = v_attempts,
            last_attempt_at = NOW(),
            status = 'locked'
        WHERE id = v_profile_id;
        
        -- Audit Log
        INSERT INTO public.audit_logs (actor_id, action, metadata)
        VALUES (v_profile_id, 'account_locked_bruteforce', jsonb_build_object('email', p_email, 'attempts', v_attempts));
        
        RETURN jsonb_build_object('status', 'locked', 'attempts', v_attempts);
    ELSE
        UPDATE public.profiles 
        SET 
            failed_attempts = v_attempts,
            last_attempt_at = NOW()
        WHERE id = v_profile_id;
        
        RETURN jsonb_build_object('status', 'incremented', 'attempts', v_attempts);
    END IF;
END;
$$;

-- 3. CREATE RESET HANDLER
CREATE OR REPLACE FUNCTION public.reset_failed_auth()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        failed_attempts = 0,
        last_attempt_at = NULL
    WHERE id = auth.uid();
END;
$$;

-- 4. GRANTS
GRANT EXECUTE ON FUNCTION public.handle_failed_auth(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_failed_auth() TO authenticated;

SELECT '✅ Account Lockout Infrastructure Deployed.' as status;
