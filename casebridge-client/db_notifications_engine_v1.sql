-- ========================================================
-- CASEBRIDGE NOTIFICATIONS ENGINE v1
-- ========================================================

-- 1. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users or profiles (UID)
    event_type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Clients/Internal users only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id = auth.uid());

-- 2. ENSURE AUDIT LOGS HAS CANONICAL FIELDS
-- actor_id, target_id, and metadata are the standard for Event Driven.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='actor_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='target_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN target_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='metadata') THEN
        ALTER TABLE public.audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 3. NOTIFICATION ROUTING ENGINE
CREATE OR REPLACE FUNCTION public.process_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_target_row RECORD;
    v_admin_cm RECORD;
    v_matter_cm UUID;
    v_matter_am UUID;
BEGIN
    -- CLIENT NOTIFICATIONS
    
    -- Event: client_case_report_submitted
    IF NEW.action = 'client_case_report_submitted' THEN
        -- 1. Notify Client (Email)
        SELECT * INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'email', jsonb_build_object(
                'title', 'Case Submission Received',
                'message', 'Your case report "' || v_target_row.title || '" has been successfully submitted.'
            ));

            -- 2. Internal Notify Admin & CM (In-app)
            FOR v_admin_cm IN 
                SELECT ufr.user_id 
                FROM public.user_firm_roles ufr
                WHERE (ufr.firm_id = NEW.firm_id OR NEW.firm_id IS NULL)
                AND ufr.status = 'active'
                AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
            LOOP
                INSERT INTO public.notifications (user_id, event_type, channel, payload)
                VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                    'title', 'New Case Intake',
                    'message', 'A new case report has been submitted: ' || v_target_row.title,
                    'link', '/intake/' || v_target_row.id
                ));
            END LOOP;
        END IF;
    END IF;

    -- Event: case_assigned
    IF NEW.action = 'case_assigned' THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (
            (NEW.metadata->>'assignee')::UUID, 
            NEW.action, 
            'in_app', 
            jsonb_build_object(
                'title', 'New Assignment',
                'message', 'You have been assigned to a new case/matter.',
                'link', '/internal/cases'
            )
        );
    END IF;

    -- Event: report_status_updated (case_review_started, case_accepted, case_rejected, case_closed)
    IF NEW.action IN ('case_review_started', 'case_accepted', 'case_rejected', 'case_closed') THEN
        SELECT * INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'email', jsonb_build_object(
                'title', 'Case Status Update',
                'message', 'The status of your case "' || v_target_row.title || '" has been updated to: ' || (NEW.metadata->>'status')
            ));
        END IF;
    END IF;

    -- Event: report_submitted (Internal)
    IF NEW.action = 'report_submitted' THEN
        -- Notify Case Manager of the matter
        SELECT assigned_case_manager INTO v_matter_cm FROM public.matters WHERE id = NEW.target_id;
        IF v_matter_cm IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_matter_cm, NEW.action, 'in_app', jsonb_build_object(
                'title', 'New Report Submitted',
                'message', 'A lawyer has submitted a new report for a matter under your supervision.',
                'link', '/internal/cases/' || NEW.target_id
            ));
        END IF;
    END IF;

    -- Event: final_report_submitted (Internal)
    IF NEW.action = 'final_report_submitted' THEN
        -- Notify Admin Manager of the firm
        FOR v_admin_cm IN 
            SELECT user_id FROM public.user_firm_roles 
            WHERE firm_id = NEW.firm_id AND LOWER(role) = 'admin_manager' AND status = 'active'
        LOOP
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'FINAL Report Submitted',
                'message', 'A matter has reached a final report phase and requires your review.',
                'link', '/internal/cases/' || NEW.target_id
            ));
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ATTACH ENGINE TO AUDIT LOGS
DROP TRIGGER IF EXISTS trg_process_notifications ON public.audit_logs;
CREATE TRIGGER trg_process_notifications
AFTER INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.process_event_notifications();

-- 5. ENSURE WORKFLOWS EMIT THE RIGHT EVENTS

-- Status Update Trigger for case_reports
CREATE OR REPLACE FUNCTION public.on_report_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_action := CASE 
            WHEN NEW.status = 'under_review' THEN 'case_review_started'
            WHEN NEW.status = 'accepted' THEN 'case_accepted'
            WHEN NEW.status = 'rejected' THEN 'case_rejected'
            WHEN NEW.status = 'closed' THEN 'case_closed'
            ELSE NULL
        END;

        IF v_action IS NOT NULL THEN
            PERFORM public.emit_case_event(v_action, NEW.id, NEW.preferred_firm_id, jsonb_build_object('status', NEW.status));
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_report_status_audit ON public.case_reports;
CREATE TRIGGER trg_report_status_audit
AFTER UPDATE ON public.case_reports
FOR EACH ROW EXECUTE FUNCTION public.on_report_status_change();

SELECT '✅ Notifications Engine v1 (Event-Driven) Applied' AS status;
