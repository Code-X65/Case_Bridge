-- 1. Create Notifications Table
CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) NOT NULL, -- Firm scoping
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    type TEXT NOT NULL, -- 'invite', 'matter_assigned', 'system', etc.
    message TEXT NOT NULL,
    link_path TEXT, -- Optional URL to navigate to
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can view their own notifications
CREATE POLICY "Users view own notifications" 
ON public.notifications 
FOR SELECT 
USING (
    user_id = auth.uid()
);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (
    user_id = auth.uid()
);

-- System (via triggers/functions) creates notifications. 
-- We allow all authenticated users to insert if it's for firm members ?? 
-- Or better, we rely on Security Definer functions/triggers.
-- Let's stick to Security Definer triggers for creation to be safe.

-- 4. Triggers for Automatic Notifications

-- TRIGGER: When Matter Assigned to Associate
CREATE OR REPLACE FUNCTION public.notify_associate_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.assigned_associate IS NOT NULL AND (OLD.assigned_associate IS NULL OR OLD.assigned_associate != NEW.assigned_associate)) THEN
        INSERT INTO public.notifications (firm_id, user_id, type, message, link_path)
        VALUES (
            NEW.firm_id,
            NEW.assigned_associate,
            'matter_assigned',
            'You have been assigned to matter: ' || NEW.title,
            '/internal/associate/matters'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_associate_assignment
AFTER UPDATE ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.notify_associate_assignment();


-- TRIGGER: When Staff Invited
-- (This might be redundant if they get an email, but good for admin dashboard if we alerted admins? 
-- Actually prompt says "Notifications are role-targeted". Invitees don't have accounts yet so we can't notify them in-app.
-- We could notify the Admins that "Someone invited user X". Skip for now as noise.)

-- TRIGGER: Matter Created (Notify Admins?)
-- Let's notify Admins when a Case Manager creates a matter.
CREATE OR REPLACE FUNCTION public.notify_admins_matter_created()
RETURNS TRIGGER AS $$
DECLARE
    admin_rec RECORD;
BEGIN
    -- Loop through all firm admins
    FOR admin_rec IN 
        SELECT user_id FROM public.user_firm_roles 
        WHERE firm_id = NEW.firm_id AND role IN ('admin', 'admin_manager') AND status = 'active'
    LOOP
        INSERT INTO public.notifications (firm_id, user_id, type, message, link_path)
        VALUES (
            NEW.firm_id,
            admin_rec.user_id,
            'matter_created',
            'New matter created: ' || NEW.title,
            '/internal/dashboard'
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_admins_matter_created
AFTER INSERT ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_matter_created();

