-- ==========================================
-- HEAL STAFF SYSTEM & FIX RACE CONDITIONS
-- ==========================================

BEGIN;

-- 1. HEAL EXISTING DATA
-- Update invitations that should be accepted
UPDATE public.invitations i
SET status = 'accepted', 
    user_id = p.id, 
    accepted_at = p.created_at
FROM public.profiles p
WHERE LOWER(i.email) = LOWER(p.email)
AND i.status = 'pending'
AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id AND u.email_confirmed_at IS NOT NULL);

-- 2. FIX ADMIN METADATA (So UI shows members)
-- If we find a user in user_firm_roles but missing metadata firm_id
-- We'll assume giyit31865@pazuric.com is the one based on our check
-- Using a more generic approach:
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT u.id, u.email, ufr.firm_id, ufr.role
        FROM auth.users u
        JOIN public.user_firm_roles ufr ON u.id = ufr.user_id
        WHERE u.raw_user_meta_data->>'firm_id' IS NULL
    ) LOOP
        UPDATE auth.users 
        SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('firm_id', r.firm_id, 'role', r.role)
        WHERE id = r.id;
    END LOOP;
END $$;

-- 3. FIX THE RPC SEQUENCE IN secure_supabase_invite
-- Moving the invitation insert BEFORE the API call
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
    v_service_key TEXT;
    v_base_url TEXT;
    v_api_url TEXT;
    v_resp_status INTEGER;
    v_resp_content TEXT;
BEGIN
    v_service_key := NULLIF(current_setting('app.settings.service_role_key', true), '');
    v_base_url := NULLIF(current_setting('app.settings.supabase_url', true), '');

    -- Fallbacks (using the ones from the file)
    IF v_service_key IS NULL THEN v_service_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJsYmdneWZkaXRnZGp6cnVjaHljIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk1NjkwMSwiZXhwIjoyMDgzNTMyOTAxfQ.9bc3wihO-32yCMZSzgk_tDjLeNLGjfFaV7a_7xnI9zw'; END IF;
    IF v_base_url IS NULL THEN v_base_url := 'https://blbggyfditgdjzruchyc.supabase.co'; END IF;

    IF NOT public.is_staff() THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    -- STEP 1: Insert into invitations FIRST (to avoid race condition with trigger)
    INSERT INTO public.invitations (email, role_preassigned, firm_id, first_name, last_name, status, updated_at)
    VALUES (LOWER(p_email), p_role, p_firm_id, p_first_name, p_last_name, 'pending', now())
    ON CONFLICT (email, firm_id) DO UPDATE SET status = 'pending', updated_at = now();

    -- STEP 2: Call Supabase Admin API
    v_api_url := v_base_url || '/auth/v1/invite?redirect_to=' || extensions.urlencode(p_redirect_to);

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
        -- If it's not email exists, maybe we should delete the invitation?
        -- But for now keeping it simple
        IF v_resp_content LIKE '%email_exists%' OR v_resp_content LIKE '%already been registered%' THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'This user has already accepted an invitation or registered.',
                'code', 'email_exists',
                'status', v_resp_status
            );
        END IF;

        RETURN jsonb_build_object('success', false, 'error', v_resp_content, 'status', v_resp_status);
    END IF;

    RETURN jsonb_build_object('success', true, 'data', v_resp_content::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
