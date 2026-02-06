-- ==========================================
-- COMPREHENSIVE ENHANCEMENTS V2 (FIXED)
-- Handles existing tables gracefully
-- ==========================================

-- ==========================================
-- PHASE 1: NOTIFICATIONS TABLE
-- ==========================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_case_id UUID,
    related_report_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add is_read column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications' 
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE public.notifications 
        ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON public.notifications(user_id, is_read, created_at DESC);

-- ==========================================
-- PHASE 2: CASE COMMENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.case_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID NOT NULL,
    author_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add matter_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'case_comments_matter_id_fkey'
    ) THEN
        ALTER TABLE public.case_comments
        ADD CONSTRAINT case_comments_matter_id_fkey
        FOREIGN KEY (matter_id) REFERENCES public.matters(id) ON DELETE CASCADE;
    END IF;

    -- Add author_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'case_comments_author_id_fkey'
    ) THEN
        ALTER TABLE public.case_comments
        ADD CONSTRAINT case_comments_author_id_fkey
        FOREIGN KEY (author_id) REFERENCES public.profiles(id);
    END IF;
END $$;

-- ==========================================
-- PHASE 3: DOCUMENT ENHANCEMENTS
-- ==========================================

DO $$ 
BEGIN
    -- Add firm_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_report_documents' 
        AND column_name = 'firm_id'
    ) THEN
        ALTER TABLE public.case_report_documents 
        ADD COLUMN firm_id UUID REFERENCES public.firms(id);
    END IF;

    -- Add is_client_visible column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_report_documents' 
        AND column_name = 'is_client_visible'
    ) THEN
        ALTER TABLE public.case_report_documents 
        ADD COLUMN is_client_visible BOOLEAN DEFAULT TRUE;
    END IF;

    -- Add uploaded_by_user_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'case_report_documents' 
        AND column_name = 'uploaded_by_user_id'
    ) THEN
        ALTER TABLE public.case_report_documents 
        ADD COLUMN uploaded_by_user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- ==========================================
-- PHASE 4: SECURITY FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.is_assigned_to_matter(matter_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.matters 
        WHERE id = matter_id 
        AND (
            assigned_associate = auth.uid() 
            OR assigned_case_manager = auth.uid()
        )
    );
END; $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_case_manager()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role IN ('admin_manager', 'case_manager')
    );
END; $$;

CREATE OR REPLACE FUNCTION public.is_associate_lawyer()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
        AND role = 'associate_lawyer'
    );
END; $$;

-- ==========================================
-- PHASE 5: RLS POLICIES
-- ==========================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_report_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "users_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "admins_manage_comments" ON public.case_comments;
DROP POLICY IF EXISTS "associates_view_assigned_comments" ON public.case_comments;
DROP POLICY IF EXISTS "client_upload_docs" ON public.case_report_documents;
DROP POLICY IF EXISTS "client_view_own_docs" ON public.case_report_documents;
DROP POLICY IF EXISTS "admins_view_all_docs" ON public.case_report_documents;
DROP POLICY IF EXISTS "associates_view_assigned_docs" ON public.case_report_documents;
DROP POLICY IF EXISTS "staff_all_docs" ON public.case_report_documents;
DROP POLICY IF EXISTS "client_own_docs" ON public.case_report_documents;

-- Notifications: Users see only their own
CREATE POLICY "users_own_notifications" ON public.notifications
FOR ALL TO authenticated
USING (auth.uid() = user_id);

-- Case Comments: Admin/CM can manage
CREATE POLICY "admins_manage_comments" ON public.case_comments
FOR ALL TO authenticated
USING (public.is_admin_or_case_manager())
WITH CHECK (public.is_admin_or_case_manager());

-- Case Comments: Associates can view on assigned cases
CREATE POLICY "associates_view_assigned_comments" ON public.case_comments
FOR SELECT TO authenticated
USING (
    public.is_associate_lawyer() 
    AND public.is_assigned_to_matter(matter_id)
);

-- Documents: Clients can upload to their own cases
CREATE POLICY "client_upload_docs" ON public.case_report_documents
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.case_reports 
        WHERE id = case_report_id 
        AND client_id = auth.uid()
    )
);

-- Documents: Clients can view their own (client-visible only)
CREATE POLICY "client_view_own_docs" ON public.case_report_documents
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.case_reports 
        WHERE id = case_report_id 
        AND client_id = auth.uid()
    )
    AND is_client_visible = TRUE
);

-- Documents: Admin/CM can view and manage all
CREATE POLICY "admins_view_all_docs" ON public.case_report_documents
FOR ALL TO authenticated
USING (public.is_admin_or_case_manager());

-- Documents: Associates can view assigned case docs
CREATE POLICY "associates_view_assigned_docs" ON public.case_report_documents
FOR SELECT TO authenticated
USING (
    public.is_associate_lawyer() 
    AND EXISTS (
        SELECT 1 FROM public.case_reports cr
        JOIN public.matters m ON m.case_report_id = cr.id
        WHERE cr.id = case_report_id
        AND public.is_assigned_to_matter(m.id)
    )
);

-- Enhanced Matter Access
DROP POLICY IF EXISTS "admins_view_all_matters" ON public.matters;
DROP POLICY IF EXISTS "associates_view_assigned_matters" ON public.matters;

CREATE POLICY "admins_view_all_matters" ON public.matters
FOR ALL TO authenticated
USING (public.is_admin_or_case_manager());

CREATE POLICY "associates_view_assigned_matters" ON public.matters
FOR SELECT TO authenticated
USING (
    public.is_associate_lawyer() 
    AND public.is_assigned_to_matter(id)
);

-- Matter Updates (Progress Reports) Access
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "associates_manage_assigned_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "staff_all_updates" ON public.matter_updates;

-- Admin/CM can manage all progress reports
CREATE POLICY "admins_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_admin_or_case_manager())
WITH CHECK (public.is_admin_or_case_manager());

-- Associates can create and view progress reports for assigned cases
CREATE POLICY "associates_manage_assigned_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (
    public.is_associate_lawyer() 
    AND public.is_assigned_to_matter(matter_id)
)
WITH CHECK (
    public.is_associate_lawyer() 
    AND public.is_assigned_to_matter(matter_id)
);

-- ==========================================
-- PHASE 6: NOTIFICATION HELPER FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_case_id UUID DEFAULT NULL,
    p_report_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (
        user_id, type, title, message, 
        related_case_id, related_report_id, metadata
    )
    VALUES (
        p_user_id, p_type, p_title, p_message,
        p_case_id, p_report_id, p_metadata
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PHASE 7: NOTIFICATION TRIGGERS
-- ==========================================

-- Trigger: New case submitted
CREATE OR REPLACE FUNCTION public.notify_staff_new_case()
RETURNS TRIGGER AS $$
DECLARE
    staff_member RECORD;
    client_name TEXT;
BEGIN
    SELECT COALESCE(first_name || ' ' || last_name, email) INTO client_name
    FROM public.external_users
    WHERE id = NEW.client_id;

    FOR staff_member IN 
        SELECT DISTINCT user_id 
        FROM public.user_firm_roles 
        WHERE status = 'active'
    LOOP
        PERFORM public.create_notification(
            staff_member.user_id,
            'case_submitted',
            'New Case Submitted',
            'A new case "' || NEW.title || '" has been submitted by ' || COALESCE(client_name, 'a client'),
            NULL,
            NEW.id,
            jsonb_build_object('category', NEW.category)
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_case ON public.case_reports;
CREATE TRIGGER trg_notify_new_case
AFTER INSERT ON public.case_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_new_case();

-- Trigger: Case status change
CREATE OR REPLACE FUNCTION public.notify_status_change()
RETURNS TRIGGER AS $$
DECLARE
    staff_member RECORD;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Notify client
        PERFORM public.create_notification(
            NEW.client_id,
            'status_change',
            'Case Status Updated',
            'Your case "' || NEW.title || '" status changed from ' || OLD.status || ' to ' || NEW.status,
            NULL,
            NEW.id,
            jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
        );

        -- Notify all staff
        FOR staff_member IN 
            SELECT DISTINCT user_id 
            FROM public.user_firm_roles 
            WHERE status = 'active'
        LOOP
            PERFORM public.create_notification(
                staff_member.user_id,
                'status_change',
                'Case Status Changed',
                'Case "' || NEW.title || '" status changed to ' || NEW.status,
                NULL,
                NEW.id,
                jsonb_build_object('new_status', NEW.status)
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_status_change ON public.case_reports;
CREATE TRIGGER trg_notify_status_change
AFTER UPDATE ON public.case_reports
FOR EACH ROW
EXECUTE FUNCTION public.notify_status_change();

-- Trigger: Matter assignment
CREATE OR REPLACE FUNCTION public.notify_assignment()
RETURNS TRIGGER AS $$
DECLARE
    client_id_val UUID;
    case_title TEXT;
BEGIN
    SELECT m.client_id, m.title INTO client_id_val, case_title
    FROM public.matters m
    WHERE m.id = NEW.id;

    -- Notify assigned associate
    IF NEW.assigned_associate IS NOT NULL AND 
       (OLD.assigned_associate IS NULL OR OLD.assigned_associate != NEW.assigned_associate) THEN
        PERFORM public.create_notification(
            NEW.assigned_associate,
            'assignment',
            'You Have Been Assigned to a Case',
            'You have been assigned as Associate Lawyer for case "' || case_title || '"',
            NEW.id,
            NULL,
            jsonb_build_object('role', 'associate_lawyer')
        );

        -- Notify client
        IF client_id_val IS NOT NULL THEN
            PERFORM public.create_notification(
                client_id_val,
                'lawyer_assigned',
                'Lawyer Assigned to Your Case',
                'An associate lawyer has been assigned to your case "' || case_title || '"',
                NEW.id,
                NULL,
                '{}'::jsonb
            );
        END IF;
    END IF;

    -- Notify assigned case manager
    IF NEW.assigned_case_manager IS NOT NULL AND 
       (OLD.assigned_case_manager IS NULL OR OLD.assigned_case_manager != NEW.assigned_case_manager) THEN
        PERFORM public.create_notification(
            NEW.assigned_case_manager,
            'assignment',
            'You Have Been Assigned as Case Manager',
            'You have been assigned as Case Manager for case "' || case_title || '"',
            NEW.id,
            NULL,
            jsonb_build_object('role', 'case_manager')
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_assignment ON public.matters;
CREATE TRIGGER trg_notify_assignment
AFTER INSERT OR UPDATE ON public.matters
FOR EACH ROW
EXECUTE FUNCTION public.notify_assignment();

-- Trigger: Progress report submission
CREATE OR REPLACE FUNCTION public.notify_report_update()
RETURNS TRIGGER AS $$
DECLARE
    matter_rec RECORD;
    author_name TEXT;
BEGIN
    -- Get matter details
    SELECT m.* INTO matter_rec
    FROM public.matters m
    WHERE m.id = NEW.matter_id;
    
    -- Get author name
    SELECT p.full_name INTO author_name
    FROM public.profiles p
    WHERE p.id = NEW.author_id;

    -- Notify client if report is client-visible
    IF NEW.client_visible = TRUE AND matter_rec.client_id IS NOT NULL THEN
        PERFORM public.create_notification(
            matter_rec.client_id,
            'report_update',
            'New Progress Report',
            'A new progress report "' || NEW.title || '" has been submitted for your case',
            NEW.matter_id,
            NULL,
            jsonb_build_object('is_final', NEW.is_final)
        );
    END IF;

    -- Notify assigned staff
    IF matter_rec.assigned_associate IS NOT NULL THEN
        PERFORM public.create_notification(
            matter_rec.assigned_associate,
            'report_update',
            'Progress Report Submitted',
            'New report "' || NEW.title || '" submitted by ' || COALESCE(author_name, 'Staff'),
            NEW.matter_id,
            NULL,
            '{}'::jsonb
        );
    END IF;

    IF matter_rec.assigned_case_manager IS NOT NULL THEN
        PERFORM public.create_notification(
            matter_rec.assigned_case_manager,
            'report_update',
            'Progress Report Submitted',
            'New report "' || NEW.title || '" submitted by ' || COALESCE(author_name, 'Staff'),
            NEW.matter_id,
            NULL,
            '{}'::jsonb
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_report_update ON public.matter_updates;
CREATE TRIGGER trg_notify_report_update
AFTER INSERT ON public.matter_updates
FOR EACH ROW
EXECUTE FUNCTION public.notify_report_update();

-- ==========================================
-- PHASE 8: GRANTS
-- ==========================================

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.case_comments TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_matter TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_case_manager TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_associate_lawyer TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Comprehensive Enhancements V2 Applied Successfully!' as status;
