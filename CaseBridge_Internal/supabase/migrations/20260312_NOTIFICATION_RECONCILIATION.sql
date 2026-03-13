-- ==========================================
-- NOTIFICATION SYSTEM RECONCILIATION & EXPANSION
-- ==========================================

-- 1. RECONCILE LEGACY COLUMNS
DO $$ 
BEGIN 
    -- Safe Handle for 'type' -> 'event_type'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='event_type') THEN
            -- Both exist: Sync data then drop old
            UPDATE public.notifications SET event_type = type WHERE event_type IS NULL;
            ALTER TABLE public.notifications DROP COLUMN type;
        ELSE
            -- Only 'type' exists: Rename
            ALTER TABLE public.notifications RENAME COLUMN type TO event_type;
        END IF;
    END IF;

    -- Safe Handle for 'read' -> 'is_read'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
            UPDATE public.notifications SET is_read = "read" WHERE is_read IS NULL;
            ALTER TABLE public.notifications DROP COLUMN "read";
        ELSE
            ALTER TABLE public.notifications RENAME COLUMN "read" TO is_read;
        END IF;
    END IF;

    -- Add 'read_at' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read_at') THEN
        ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ;
    END IF;

    -- Add 'payload' JSONB if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='payload') THEN
        ALTER TABLE public.notifications ADD COLUMN payload JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add 'channel' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='channel') THEN
        ALTER TABLE public.notifications ADD COLUMN channel TEXT DEFAULT 'in_app';
    END IF;

    -- Add 'category' if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='category') THEN
        ALTER TABLE public.notifications ADD COLUMN category TEXT;
    END IF;
END $$;

-- 2. DATA PORTING (Historical Sync)
-- Port legacy message/link into the new payload structure for existing records
UPDATE public.notifications 
SET payload = jsonb_build_object(
    'title', COALESCE(event_type, 'Notification'),
    'message', message,
    'link', COALESCE(link_path, '')
)
WHERE payload = '{}'::jsonb AND message IS NOT NULL;

-- 3. EXPANDING BUSINESS TRIGGERS

-- A. NOTIFY CASE MANAGER & CLIENT ON STATUS CHANGE
CREATE OR REPLACE FUNCTION public.notify_matter_status_update()
RETURNS TRIGGER AS $$
DECLARE
    cm_id UUID;
    client_id UUID;
BEGIN
    IF (OLD.lifecycle_state != NEW.lifecycle_state) THEN
        -- Link to Matter
        client_id := NEW.client_id;
        cm_id := NEW.assigned_case_manager;

        -- Notify Case Manager
        IF cm_id IS NOT NULL THEN
            INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
            VALUES (
                NEW.firm_id,
                cm_id,
                'matter_status_changed',
                'matter_updates',
                jsonb_build_object(
                    'title', 'Matter Status Updated',
                    'message', 'Matter "' || NEW.title || '" has been moved to ' || NEW.lifecycle_state,
                    'link', '/internal/matter/' || NEW.id
                )
            );
        END IF;

        -- Notify Client
        IF client_id IS NOT NULL THEN
            INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
            VALUES (
                NEW.firm_id,
                client_id,
                'case_status_changed',
                'matter_updates',
                jsonb_build_object(
                    'title', 'Your Case Status Has Changed',
                    'message', 'Your matter "' || NEW.title || '" is now: ' || NEW.lifecycle_state,
                    'link', '/client/dashboard'
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Status Updates (Case Manager & Client)
DROP TRIGGER IF EXISTS trigger_notify_matter_status_update ON public.matters;
CREATE TRIGGER trigger_notify_matter_status_update
AFTER UPDATE OF lifecycle_state ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.notify_matter_status_update();

-- A2. NOTIFY ADMIN ON NEW MATTER (INSERT)
CREATE OR REPLACE FUNCTION public.notify_admin_new_matter()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Find and notify all admins of the firm
    FOR admin_id IN (
        SELECT user_id FROM public.user_firm_roles 
        WHERE firm_id = NEW.firm_id AND role = 'admin_manager' AND status = 'active'
    ) LOOP
        INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
        VALUES (
            NEW.firm_id,
            admin_id,
            'new_matter_created',
            'matter_updates',
            jsonb_build_object(
                'title', 'New Matter Submitted',
                'message', 'A new matter has been initiated: ' || NEW.title,
                'link', '/internal/admin/dashboard'
            )
        );
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admin_new_matter ON public.matters;
CREATE TRIGGER trigger_notify_admin_new_matter
AFTER INSERT ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.notify_admin_new_matter();

-- B. NOTIFY CASE MANAGER ON ASSOCIATE ASSIGNMENT
-- (Extending existing notify_associate_assignment to also notify the CM)
CREATE OR REPLACE FUNCTION public.notify_assignment_cluster()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify Associate (Existing logic)
    IF (NEW.assigned_associate IS NOT NULL AND (OLD.assigned_associate IS NULL OR OLD.assigned_associate != NEW.assigned_associate)) THEN
        INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
        VALUES (
            NEW.firm_id,
            NEW.assigned_associate,
            'matter_assigned',
            'assignments',
            jsonb_build_object(
                'title', 'New Matter Assignment',
                'message', 'You have been assigned to matter: ' || NEW.title,
                'link', '/internal/associate/matters'
            )
        );

        -- Notify Case Manager that they've successfully assigned someone
        IF NEW.assigned_case_manager IS NOT NULL THEN
            INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
            VALUES (
                NEW.firm_id,
                NEW.assigned_case_manager,
                'assignment_confirmed',
                'assignments',
                jsonb_build_object(
                    'title', 'Associate Assigned',
                    'message', 'You assigned an associate to matter: ' || NEW.title,
                    'link', '/internal/matter/' || NEW.id
                )
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_assignment_cluster ON public.matters;
CREATE TRIGGER trigger_notify_assignment_cluster
AFTER UPDATE OF assigned_associate ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_cluster();

-- C. NOTIFY ON DOCUMENT UPLOAD
CREATE OR REPLACE FUNCTION public.notify_document_event()
RETURNS TRIGGER AS $$
DECLARE
    matter_rec RECORD;
BEGIN
    SELECT * INTO matter_rec FROM public.matters WHERE id = NEW.matter_id;
    
    -- If Case Manager uploads, notify Client
    -- If Client uploads, notify Case Manager & Associate
    
    -- (Assuming 'uploaded_by' or similar exists, if not we fall back to generic alert)
    -- For now, notify both associated roles about any new file to be safe.
    
    -- Notify Case Manager
    IF matter_rec.assigned_case_manager IS NOT NULL THEN
        INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
        VALUES (
            matter_rec.firm_id,
            matter_rec.assigned_case_manager,
            'document_uploaded',
            'matter_updates',
            jsonb_build_object(
                'title', 'New Document Uploaded',
                'message', 'A new document has been added to matter: ' || matter_rec.title,
                'link', '/internal/matter/' || matter_rec.id
            )
        );
    END IF;

    -- Notify Client
    IF matter_rec.client_id IS NOT NULL THEN
        INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
        VALUES (
            matter_rec.firm_id,
            matter_rec.client_id,
            'document_available',
            'matter_updates',
            jsonb_build_object(
                'title', 'New Document Available',
                'message', 'The legal team has shared a new document in your portal: ' || matter_rec.title,
                'link', '/client/dashboard'
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Document Uploads (General Vault)
DROP TRIGGER IF EXISTS trigger_notify_document_vault ON public.client_documents;
CREATE TRIGGER trigger_notify_document_vault
AFTER INSERT ON public.client_documents
FOR EACH ROW EXECUTE FUNCTION public.notify_document_event();

-- C2. NOTIFY ON PROGRESS REPORT DOCUMENTS
-- Trigger on report_documents junction
CREATE OR REPLACE FUNCTION public.notify_report_document_event()
RETURNS TRIGGER AS $$
DECLARE
    matter_id_val UUID;
BEGIN
    -- Resolve matter_id via matter_updates
    SELECT matter_id INTO matter_id_val FROM public.matter_updates WHERE id = NEW.report_id;
    
    IF matter_id_val IS NOT NULL THEN
        -- Re-use the matter record logic
        PERFORM public.notify_document_logic(matter_id_val);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper to centralize logic
CREATE OR REPLACE FUNCTION public.notify_document_logic(p_matter_id UUID)
RETURNS VOID AS $$
DECLARE
    matter_rec RECORD;
BEGIN
    SELECT * INTO matter_rec FROM public.matters WHERE id = p_matter_id;
    
    -- Notify Case Manager
    IF matter_rec.assigned_case_manager IS NOT NULL THEN
        INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
        VALUES (
            matter_rec.firm_id,
            matter_rec.assigned_case_manager,
            'document_uploaded',
            'matter_updates',
            jsonb_build_object(
                'title', 'New Matter Document',
                'message', 'A new document has been added to matter: ' || matter_rec.title,
                'link', '/internal/matter/' || matter_rec.id
            )
        );
    END IF;

    -- Notify Client
    IF matter_rec.client_id IS NOT NULL THEN
        INSERT INTO public.notifications (firm_id, user_id, event_type, category, payload)
        VALUES (
            matter_rec.firm_id,
            matter_rec.client_id,
            'document_available',
            'matter_updates',
            jsonb_build_object(
                'title', 'New Document Shared',
                'message', 'A new document is available in your portal for: ' || matter_rec.title,
                'link', '/client/dashboard'
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_report_document ON public.report_documents;
CREATE TRIGGER trigger_notify_report_document
AFTER INSERT ON public.report_documents
FOR EACH ROW EXECUTE FUNCTION public.notify_report_document_event();

SELECT '✅ Notification Reconciliation & Trigger Expansion Applied' AS status;
