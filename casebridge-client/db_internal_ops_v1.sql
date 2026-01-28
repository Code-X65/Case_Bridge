-- ========================================================
-- INTERNAL UX & OPERATIONS v1 (CANONICAL)
-- ========================================================

-- 1. PROFILE ENHANCEMENTS
-- Adding fields for coordination and operations (not marketing)
DO $$ 
BEGIN
    -- Phone Number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
    END IF;

    -- Timezone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='timezone') THEN
        ALTER TABLE public.profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';
    END IF;

    -- Preferred Meeting Type
    -- Relies on the meeting_type enum from db_scheduling_v1.sql
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='preferred_meeting_type') THEN
        ALTER TABLE public.profiles ADD COLUMN preferred_meeting_type public.meeting_type DEFAULT 'virtual';
    END IF;
END $$;

-- 2. DOCUMENT VISIBILITY CONTROLS
-- Ensure matter_updates (reports) has strictly defined visibility as per operations v1
-- The column client_visible already exists, but we explicitly use it for the Document Workspace.

-- 3. AUDIT LOGS FOR PROFILE UPDATES
-- Standardized audit triggers for operational tracking
CREATE OR REPLACE FUNCTION public.audit_profile_updates()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (actor_id, action, target_id, metadata)
    VALUES (
        auth.uid(),
        'profile_updated',
        NEW.id,
        jsonb_build_object(
            'changed_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM (
                    SELECT key, value 
                    FROM jsonb_each(to_jsonb(NEW))
                    WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key
                ) s
            )
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_profile_updates ON public.profiles;
CREATE TRIGGER trg_audit_profile_updates
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.audit_profile_updates();

SELECT '✅ Internal UX & Operations v1 Schema Applied' AS status;
