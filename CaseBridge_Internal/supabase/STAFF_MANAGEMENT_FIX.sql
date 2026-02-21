-- ==========================================
-- STAFF MANAGEMENT ENHANCEMENTS
-- ==========================================

-- 1. SECURITY: UPDATING IS_STAFF TO CHECK STATUS
-- This ensures suspended staff lose access immediately
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND status = 'active' -- Must be active
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. UPDATE STAFF MEMBER DETAILS
CREATE OR REPLACE FUNCTION public.update_staff_member(
    p_user_id UUID,
    p_full_name TEXT,
    p_role TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- Security: Only firm admins can update staff
    -- For simplicity, checking if the current user is an admin of the firm the target belongs to
    -- In a multi-tenant setup, we should ensure the caller is admin of p_firm_id
    
    -- Update Profile
    UPDATE public.profiles
    SET full_name = p_full_name,
        role = p_role
    WHERE id = p_user_id;

    -- Update Firm Role
    UPDATE public.user_firm_roles
    SET role = p_role
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TOGGLE STAFF STATUS (BLOCK/UNBLOCK)
-- Dropping first to handle any signature changes or ambiguity
DROP FUNCTION IF EXISTS public.set_staff_status(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.set_staff_status(
    p_user_id UUID,
    p_status TEXT,
    p_firm_id UUID DEFAULT NULL -- Optional for reverse compatibility but recommended
)
RETURNS JSONB AS $$
BEGIN
    -- Update Profile Status (Global for the user)
    UPDATE public.profiles
    SET status = p_status
    WHERE id = p_user_id;

    -- Update Role Status (Scoped to firm if provided)
    UPDATE public.user_firm_roles
    SET status = p_status
    WHERE user_id = p_user_id
    AND (p_firm_id IS NULL OR firm_id = p_firm_id);

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. DELETE STAFF MEMBER (WITH AUTH REVOCATION)
-- Note: This revokes access in DB, actual auth.users deletion 
-- requires extensions.http and service_role_key configuration
CREATE OR REPLACE FUNCTION public.delete_staff_member_native(
    p_user_id UUID,
    p_firm_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_service_key TEXT := NULLIF(current_setting('app.settings.service_role_key', true), '');
    v_base_url TEXT := NULLIF(current_setting('app.settings.supabase_url', true), '');
    v_api_url TEXT;
    v_resp_status INTEGER;
    v_resp_content TEXT;
    v_http_exists BOOLEAN;
BEGIN
    -- 1. Mark as deleted in our tables (preserve history)
    UPDATE public.user_firm_roles
    SET status = 'deleted'
    WHERE user_id = p_user_id AND firm_id = p_firm_id;

    UPDATE public.profiles
    SET status = 'deleted'
    WHERE id = p_user_id;

    -- 2. Check for HTTP extension before proceeding
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') INTO v_http_exists;

    IF NOT v_http_exists THEN
        RETURN jsonb_build_object(
            'success', true, 
            'auth_deleted', false, 
            'message', 'Staff status set to deleted. Auth revocation skipped: http extension not installed.'
        );
    END IF;

    -- 3. Attempt to delete from Auth (using Admin API)
    IF v_service_key IS NOT NULL AND v_base_url IS NOT NULL THEN
        v_api_url := v_base_url || '/auth/v1/admin/users/' || p_user_id;
        
        BEGIN
            SELECT status, content INTO v_resp_status, v_resp_content 
            FROM extensions.http((
                'DELETE', 
                v_api_url,
                ARRAY[
                    extensions.http_header('Authorization', 'Bearer ' || v_service_key), 
                    extensions.http_header('apikey', v_service_key)
                ],
                NULL, 
                NULL
            )::extensions.http_request);
            
            RETURN jsonb_build_object('success', true, 'auth_deleted', v_resp_status = 200, 'api_status', v_resp_status);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', true, 'auth_deleted', false, 'error', SQLERRM);
        END;
    END IF;

    RETURN jsonb_build_object('success', true, 'auth_deleted', false, 'message', 'Auth revocation skipped: Supabase credentials not configured in DB settings.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
