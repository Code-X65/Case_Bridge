-- ====================================================================
-- 🚀 NATIVE SUPABASE INVITATION SYSTEM
-- ====================================================================

-- 1. AUTH TRIGGER FOR PROFILE CREATION
-- This handles user creation when they accept a Supabase invite
CREATE OR REPLACE FUNCTION public.handle_invited_user_setup()
RETURNS TRIGGER AS $$
DECLARE
    v_firm_id UUID;
    v_role TEXT;
BEGIN
    -- Extract metadata from auth.users
    v_firm_id := (NEW.raw_user_meta_data->>'firm_id')::UUID;
    v_role := NEW.raw_user_meta_data->>'role';

    IF v_firm_id IS NOT NULL AND v_role IS NOT NULL THEN
        -- Create record in profiles
        INSERT INTO public.profiles (id, email, full_name, role, status)
        VALUES (
            NEW.id, 
            NEW.email, 
            COALESCE((NEW.raw_user_meta_data->>'first_name'), '') || ' ' || COALESCE((NEW.raw_user_meta_data->>'last_name'), ''),
            v_role,
            'active'
        )
        ON CONFLICT (id) DO UPDATE SET 
            full_name = EXCLUDED.full_name,
            role = EXCLUDED.role;

        -- Create record in user_firm_roles
        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status)
        VALUES (NEW.id, v_firm_id, v_role, 'active')
        ON CONFLICT (user_id, firm_id) DO UPDATE SET role = EXCLUDED.role;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_invited ON auth.users;
CREATE TRIGGER on_auth_user_created_invited
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_invited_user_setup();

-- 2. SECURE RPC TO WRAP ADMIN INVITATION
-- Note: Requires extensions.http and service_role key (configured via pgrst.jwt_secret or passed)
-- Ensure is_staff function exists as it is crucial for RLS and security checks
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to send native Supabase invitation
CREATE OR REPLACE FUNCTION public.secure_supabase_invite(
    p_email TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_role TEXT,
    p_firm_id UUID,
    p_redirect_to TEXT
)
RETURNS JSONB AS $$
DECLARE
    -- Variable declarations with types and initial fallbacks
    v_service_key TEXT;
    v_base_url TEXT;
    v_api_url TEXT;
    v_resp_status INTEGER;
    v_resp_content TEXT;
BEGIN
    -- Assign values in the body
    v_service_key := NULLIF(current_setting('app.settings.service_role_key', true), '');
    v_base_url := NULLIF(current_setting('app.settings.supabase_url', true), '');

    -- Fallbacks
    IF v_service_key IS NULL THEN 
        v_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmdneWZkaXRnZGp6cnVjaHljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1NjkwMSwiZXhwIjoyMDgzNTMyOTAxfQ.9bc3wihO-32yCMZSzgk_tDjLeNLGjfFaV7a_7xnI9zw';
    END IF;
    IF v_base_url IS NULL THEN
        v_base_url := 'https://blbggyfditgdjzruchyc.supabase.co';
    END IF;

    -- Security check: only staff can invite
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Standard Supabase Auth Invite Endpoint is /auth/v1/invite
    -- Append redirect_to as a query parameter for maximum reliability in sub-path preservation
    v_api_url := v_base_url || '/auth/v1/invite?redirect_to=' || extensions.urlencode(p_redirect_to);

    -- Call Supabase Admin API
    SELECT status, content INTO v_resp_status, v_resp_content 
    FROM extensions.http((
        'POST', 
        v_api_url,
        ARRAY[
            extensions.http_header('Content-Type', 'application/json'), 
            extensions.http_header('Authorization', 'Bearer ' || v_service_key), 
            extensions.http_header('apikey', v_service_key)
        ],
        'application/json', 
        jsonb_build_object(
            'email', LOWER(p_email), 
            'data', jsonb_build_object(
                'first_name', p_first_name,
                'last_name', p_last_name,
                'role', p_role,
                'firm_id', p_firm_id
            )
        )::text
    )::extensions.http_request);

    IF v_resp_status >= 400 THEN
        -- Handle "email_exists" gracefully
        IF v_resp_content LIKE '%email_exists%' OR v_resp_content LIKE '%already been registered%' THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'This user has already accepted an invitation or registered. They should use the login page.',
                'code', 'email_exists',
                'status', v_resp_status
            );
        END IF;

        RETURN jsonb_build_object(
            'success', false, 
            'error', v_resp_content, 
            'status', v_resp_status,
            'url_attempted', v_api_url
        );
    END IF;

    -- Update our internal invitations table for tracking
    INSERT INTO public.invitations (email, role_preassigned, firm_id, first_name, last_name, status, updated_at)
    VALUES (LOWER(p_email), p_role, p_firm_id, p_first_name, p_last_name, 'pending', now())
    ON CONFLICT (email, firm_id) DO UPDATE SET status = 'pending', updated_at = now();

    RETURN jsonb_build_object('success', true, 'data', v_resp_content::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
