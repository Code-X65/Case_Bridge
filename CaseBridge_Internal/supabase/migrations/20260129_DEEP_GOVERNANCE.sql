-- ==========================================================
-- DEEP GOVERNANCE: AUDIT EVERYTHING
-- ==========================================================

-- 1. FIRM PROFILE AUDIT
CREATE OR REPLACE FUNCTION public.audit_firm_updates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (
        auth.uid(), 
        NEW.id, 
        'firm_profile_updated', 
        NEW.id, 
        jsonb_build_object(
            'changes', 
            jsonb_strip_nulls(jsonb_build_object(
                'name', CASE WHEN OLD.name IS DISTINCT FROM NEW.name THEN NEW.name ELSE NULL END,
                'email', CASE WHEN OLD.email IS DISTINCT FROM NEW.email THEN NEW.email ELSE NULL END,
                'phone', CASE WHEN OLD.phone IS DISTINCT FROM NEW.phone THEN NEW.phone ELSE NULL END,
                'website', CASE WHEN OLD.website IS DISTINCT FROM NEW.website THEN NEW.website ELSE NULL END,
                'logo_url', CASE WHEN OLD.logo_url IS DISTINCT FROM NEW.logo_url THEN NEW.logo_url ELSE NULL END
            ))
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_firm_updates ON public.firms;
CREATE TRIGGER trigger_audit_firm_updates
AFTER UPDATE ON public.firms
FOR EACH ROW EXECUTE FUNCTION public.audit_firm_updates();

-- 2. USER PROFILE GOVERNANCE (Role changes, etc.)
CREATE OR REPLACE FUNCTION public.audit_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role OR OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        SELECT 
            auth.uid(), 
            ufr.firm_id, 
            'staff_profile_updated', 
            NEW.id, 
            jsonb_build_object(
                'email', NEW.email,
                'old_role', OLD.role,
                'new_role', NEW.role,
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        FROM public.user_firm_roles ufr
        WHERE ufr.user_id = NEW.id
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_profile_updates ON public.profiles;
CREATE TRIGGER trigger_audit_profile_updates
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_profile_updates();

-- 3. UNIFY MATTER AUDITS (Ensure consistency)
CREATE OR REPLACE FUNCTION public.audit_matter_lifecycle()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (auth.uid(), NEW.firm_id, 'matter_created', NEW.id, jsonb_build_object('title', NEW.title, 'status', NEW.status));
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) THEN
            INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
            VALUES (auth.uid(), NEW.firm_id, 'matter_status_changed', NEW.id, jsonb_build_object('title', NEW.title, 'old_status', OLD.status, 'new_status', NEW.status));
        END IF;
        IF (OLD.assigned_associate IS DISTINCT FROM NEW.assigned_associate) THEN
            INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
            VALUES (auth.uid(), NEW.firm_id, 'matter_associate_reassigned', NEW.id, jsonb_build_object('title', NEW.title, 'associate_id', NEW.assigned_associate));
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (auth.uid(), OLD.firm_id, 'matter_deleted', OLD.id, jsonb_build_object('title', OLD.title));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_matter_lifecycle ON public.matters;
CREATE TRIGGER trigger_audit_matter_lifecycle
AFTER INSERT OR UPDATE OR DELETE ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.audit_matter_lifecycle();

-- 4. LOGIN LOGGING (Refined)
CREATE OR REPLACE FUNCTION public.audit_session_start()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (NEW.user_id, NEW.firm_id, 'user_login', NEW.user_id, jsonb_build_object('role', NEW.role, 'session_id', NEW.id));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_audit_session_start ON public.internal_sessions;
CREATE TRIGGER trigger_audit_session_start
AFTER INSERT ON public.internal_sessions
FOR EACH ROW EXECUTE FUNCTION public.audit_session_start();

SELECT '✅ Deep Governance Active: All critical platform actions are now audited.' as status;
