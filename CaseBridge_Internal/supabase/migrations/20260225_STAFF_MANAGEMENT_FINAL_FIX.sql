-- ==========================================
-- STAFF MANAGEMENT REFINEMENTS (FINAL - DEFENSIVE)
-- ==========================================

-- 1. FIX: Double-state invitation issue
-- Mark invite as accepted in the trigger that handles user setup
CREATE OR REPLACE FUNCTION public.handle_invited_user_setup()
RETURNS TRIGGER AS $$
DECLARE
    v_firm_id UUID;
    v_role TEXT;
BEGIN
    -- Extract metadata from auth.users (standard Supabase invite flow)
    v_firm_id := (NEW.raw_user_meta_data->>'firm_id')::UUID;
    v_role := NEW.raw_user_meta_data->>'role';

    IF v_firm_id IS NOT NULL AND v_role IS NOT NULL THEN
        -- Create/Update record in profiles
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

        -- Create/Update record in user_firm_roles
        INSERT INTO public.user_firm_roles (user_id, firm_id, role, status)
        VALUES (NEW.id, v_firm_id, v_role, 'active')
        ON CONFLICT (user_id, firm_id) DO UPDATE SET role = EXCLUDED.role;

        -- SYNC: Update the internal invitations table to prevent "double-listing"
        UPDATE public.invitations
        SET status = 'accepted',
            accepted_at = NOW(),
            user_id = NEW.id
        WHERE LOWER(email) = LOWER(NEW.email) 
        AND firm_id = v_firm_id 
        AND status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ENHANCEMENT: Preserve Records on Staff Deletion
-- Adjust foreign keys to use ON DELETE SET NULL for historical stability.

-- MATTERS: Defensive Alter
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matters') THEN
        ALTER TABLE public.matters ALTER COLUMN created_by DROP NOT NULL;
        ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_created_by_fkey;
        ALTER TABLE public.matters ADD CONSTRAINT matters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

        ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_assigned_case_manager_fkey;
        ALTER TABLE public.matters ADD CONSTRAINT matters_assigned_case_manager_fkey FOREIGN KEY (assigned_case_manager) REFERENCES public.profiles(id) ON DELETE SET NULL;

        ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_assigned_associate_fkey;
        ALTER TABLE public.matters ADD CONSTRAINT matters_assigned_associate_fkey FOREIGN KEY (assigned_associate) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- TASKS: Defensive Alter
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
        ALTER TABLE public.tasks ALTER COLUMN assigned_to DROP NOT NULL;
        ALTER TABLE public.tasks ALTER COLUMN created_by DROP NOT NULL;

        ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;

        ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;
        ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- AUDIT LOGS: Canonical table should exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_id_fkey;
        ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') THEN
            ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
            ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- INVITATIONS: Canonical table should exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitations') THEN
        ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey;
        ALTER TABLE public.invitations ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;


-- 3. LIVE ROLE UPDATE: update_staff_member
-- Updates Profile, Firm Role, and ALL Active Sessions so changes reflect immediately.
CREATE OR REPLACE FUNCTION public.update_staff_member(
    p_user_id UUID,
    p_full_name TEXT,
    p_role TEXT
)
RETURNS JSONB AS $$
BEGIN
    -- 1. Update Profile
    UPDATE public.profiles
    SET full_name = p_full_name,
        role = p_role
    WHERE id = p_user_id;

    -- 2. Update Firm Role (This handles RLS access)
    UPDATE public.user_firm_roles
    SET role = p_role
    WHERE user_id = p_user_id;

    -- 3. Update ACTIVE SESSIONS (This ensures live dashboard updates)
    -- We update the role in the sessions table so the next session check sees the new role.
    UPDATE public.internal_sessions
    SET role = p_role
    WHERE user_id = p_user_id;

    -- 4. Audit Log
    INSERT INTO public.audit_logs (actor_id, action, target_id, metadata)
    VALUES (auth.uid(), 'staff_updated', p_user_id, jsonb_build_object(
        'new_role', p_role,
        'new_name', p_full_name
    ));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. UPDATED RPC: delete_staff_member_native
-- Now explicitly deletes the profile and authentication (via RPC) while work is preserved by FKs above.
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
    -- 1. Remove from firm memberships (Hard Delete mapping)
    DELETE FROM public.user_firm_roles
    WHERE user_id = p_user_id AND firm_id = p_firm_id;

    -- 2. Delete Profile table record (This triggers ON DELETE SET NULL on matters/tasks)
    DELETE FROM public.profiles
    WHERE id = p_user_id;

    -- 3. Check for HTTP extension before attempting Auth account deletion
    SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') INTO v_http_exists;

    IF NOT v_http_exists THEN
        RETURN jsonb_build_object(
            'success', true, 
            'auth_deleted', false, 
            'message', 'Staff profile and roles deleted locally. Auth account deletion requires http extension.'
        );
    END IF;

    -- 4. Invoke Supabase Admin API to delete the authentication identity
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
            
            RETURN jsonb_build_object('success', true, 'auth_deleted', (v_resp_status = 200 OR v_resp_status = 204), 'api_status', v_resp_status);
        EXCEPTION WHEN OTHERS THEN
            RETURN jsonb_build_object('success', true, 'auth_deleted', false, 'error', SQLERRM);
        END;
    END IF;

    RETURN jsonb_build_object('success', true, 'auth_deleted', false, 'message', 'Profile deleted. Auth deletion skipped: Config missing.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Staff Management Refinements (Live Role Updates & Defensive checks) Applied.' AS status;
