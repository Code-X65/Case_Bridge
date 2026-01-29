-- ==========================================================
-- CONSOLIDATED AUDIT LOGGING SYSTEM (CANONICAL)
-- ==========================================================

-- 1. Ensure the table has the correct canonical columns
DO $$ 
BEGIN
    -- Rename user_id to actor_id if it exists and actor_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'user_id') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'actor_id') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN user_id TO actor_id;
    END IF;

    -- Rename details to metadata if it exists and metadata doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'details') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'metadata') THEN
        ALTER TABLE public.audit_logs RENAME COLUMN details TO metadata;
    END IF;

    -- Add target_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'target_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN target_id UUID;
    END IF;
END $$;

-- 2. Update LOGIN Trigger
CREATE OR REPLACE FUNCTION public.trigger_audit_login()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (NEW.user_id, NEW.firm_id, 'user_login', NEW.user_id, jsonb_build_object('session_id', NEW.id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update ROLE ASSIGNMENT Trigger
CREATE OR REPLACE FUNCTION public.trigger_audit_role_assigned()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (
        COALESCE(auth.uid(), NEW.user_id), -- Actor is the person assigning, fallback to user themselves if signup
        NEW.firm_id, 
        'role_assigned', 
        NEW.user_id,
        jsonb_build_object('role', LOWER(NEW.role))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure RLS allows triggers (system) to insert
DROP POLICY IF EXISTS "Allow system to insert logs" ON public.audit_logs;
CREATE POLICY "Allow system to insert logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- 5. Revise SELECT policy using the stable helper
DROP POLICY IF EXISTS "audit_read" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view firm logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can view firm audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view firm audit logs" ON public.audit_logs
    FOR SELECT USING (public.is_firm_admin(firm_id));

-- 6. Add trigger for status changes in profiles (if applicable)
CREATE OR REPLACE FUNCTION public.trigger_audit_profile_status()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        SELECT 
            auth.uid(), 
            ufr.firm_id, 
            'user_status_changed', 
            NEW.id, 
            jsonb_build_object('new_status', NEW.status, 'old_status', OLD.status)
        FROM public.user_firm_roles ufr
        WHERE ufr.user_id = NEW.id
        LIMIT 1; -- Get primary firm
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_status_change_audit ON public.profiles;
CREATE TRIGGER on_profile_status_change_audit
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trigger_audit_profile_status();

SELECT '✅ Audit Log System Unified to Canonical Schema.' as status;
