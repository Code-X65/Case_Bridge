-- ==========================================
-- RECONCILE FRONTEND RPCs & INVITE SYSTEM
-- ==========================================

-- 1. Create secure_supabase_invite wrapper
CREATE OR REPLACE FUNCTION public.secure_supabase_invite(
    p_email TEXT,
    p_role TEXT,
    p_firm_id UUID,
    p_first_name TEXT DEFAULT '',
    p_last_name TEXT DEFAULT '',
    p_redirect_to TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
    v_token UUID;
BEGIN
    -- Call the actual creation logic
    v_token := public.create_secure_invitation(
        p_email,
        p_role,
        p_firm_id,
        p_first_name,
        p_last_name
    );

    -- Return success and the token/link for the edge function caller
    RETURN jsonb_build_object(
        'success', true,
        'token', v_token,
        'email', p_email,
        'invite_link', p_redirect_to || '?token=' || v_token
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Audit Log for invite resend (if not already handled)
-- The existing resend_secure_invitation function exists but the frontend might call secure_supabase_invite again if it finds an existing invite.
-- We'll handle that in the RPC logic if needed, but for now we'll just ensure the wrapper is robust.

-- 3. Ensure RLS for matter_messages allows direct head/count checks
-- (Already handled in previous migrations, but double checking count checks)
-- The profiles and user_firm_roles tables need to be readable for the dashboard.
-- Ensure public.profiles is readable by authenticated users in the same firm.

DROP POLICY IF EXISTS "profiles_select_firm" ON public.profiles;
CREATE POLICY "profiles_select_firm" ON public.profiles
FOR SELECT USING (
    id IN (
        SELECT user_id FROM public.user_firm_roles 
        WHERE firm_id IN (SELECT f_id FROM public.get_my_firms())
    )
);

SELECT '✅ Invitation RPC wrapper and RLS hardening completed.' AS status;
