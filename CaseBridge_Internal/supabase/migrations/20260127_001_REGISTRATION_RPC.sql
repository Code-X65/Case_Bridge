-- ==========================================
-- FIRM REGISTRATION COMPLETION RPC
-- ==========================================

-- 1. Add missing columns to firms table
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

-- 2. The Atomic Registration Function
DROP FUNCTION IF EXISTS public.complete_firm_registration(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.complete_firm_registration(
    p_user_id UUID,
    p_firm_name TEXT,
    p_firm_email TEXT,
    p_firm_phone TEXT,
    p_firm_address TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_user_phone TEXT
)
RETURNS UUID AS $$
DECLARE
    v_firm_id UUID;
BEGIN
    -- 1. Create the Firm
    INSERT INTO public.firms (name, email, phone, address, owner_id, status)
    VALUES (p_firm_name, p_firm_email, p_firm_phone, p_firm_address, p_user_id, 'active')
    RETURNING id INTO v_firm_id;

    -- 2. Create/Update Profile
    INSERT INTO public.profiles (id, full_name, role, email, status, onboarding_state, first_login_flag)
    VALUES (
        p_user_id,
        COALESCE(p_first_name, '') || ' ' || COALESCE(p_last_name, ''),
        'admin_manager',
        p_firm_email,
        'active',
        'completed',
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = 'admin_manager',
        onboarding_state = 'completed';

    -- 3. Assign Primary Admin Role
    INSERT INTO public.user_firm_roles (user_id, firm_id, role, status, is_primary)
    VALUES (p_user_id, v_firm_id, 'admin_manager', 'active', TRUE)
    ON CONFLICT (user_id, firm_id) DO UPDATE SET
        role = 'admin_manager',
        status = 'active';

    -- 4. Delete the pending registration
    DELETE FROM public.pending_firm_registrations WHERE user_id = p_user_id;

    RETURN v_firm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.complete_firm_registration TO authenticated;

SELECT '✅ Registration RPC and Firm Schema updated.' AS status;
