-- ==========================================
-- PHASE 10: REAL-TIME NOTIFICATIONS & SIGNUP TRIGGERS
-- ==========================================

-- 1. Enable Realtime for Notifications table
-- This allows Supabase to broadcast changes via WebSocket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- 2. Update process_event_notifications to handle client_signup
CREATE OR REPLACE FUNCTION public.process_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_target_row RECORD;
    v_admin_cm RECORD;
    v_matter_cm UUID;
    v_client_id UUID;
    v_title TEXT;
    v_case_report_id UUID;
BEGIN
    -- [NEW] Handle Client Signup (directly from audit_logs)
    IF NEW.action = 'client_signup' THEN
        FOR v_admin_cm IN 
            SELECT ufr.user_id 
            FROM public.user_firm_roles ufr
            WHERE ufr.status = 'active'
            AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
        LOOP
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'New Client Registered',
                'message', 'A new client has registered: ' || (NEW.metadata->>'full_name'),
                'link', '/internal/staff' -- Direct to staff/client management
            ));
        END LOOP;
        RETURN NEW;
    END IF;

    -- [EXISTING LOGIC CONTINUES]
    
    -- 1. IDENTIFY THE CLIENT AND CONTEXT
    SELECT id, client_id, title, case_report_id INTO v_target_row FROM public.matters WHERE id = NEW.target_id;
    
    IF FOUND THEN
        v_client_id := v_target_row.client_id;
        v_title := v_target_row.title;
        v_case_report_id := v_target_row.case_report_id;
    ELSE
        SELECT id, client_id, title INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND THEN
            v_client_id := v_target_row.client_id;
            v_title := v_target_row.title;
            v_case_report_id := v_target_row.id;
        END IF;
    END IF;

    IF NEW.action = 'invoice_paid' THEN
        SELECT client_id INTO v_client_id FROM public.invoices WHERE id = NEW.target_id;
    END IF;

    IF NEW.action = 'document_uploaded' THEN
        IF (NEW.metadata->>'is_client_visible')::BOOLEAN = TRUE AND (NEW.metadata->>'uploader_role') = 'staff' THEN
            SELECT client_id, title INTO v_target_row FROM public.case_reports WHERE id = (NEW.metadata->>'case_id')::UUID;
            v_client_id := v_target_row.client_id;
            v_title := v_target_row.title;
            v_case_report_id := v_target_row.id;
        END IF;
    END IF;

    -- 2. CLIENT NOTIFICATIONS
    IF NEW.action = 'client_case_report_submitted' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'Case Submitted',
            'message', 'Your report "' || v_title || '" has been successfully filed.',
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    IF NEW.action IN ('case_review_started', 'case_accepted', 'case_rejected', 'case_closed') AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'Case Status Update',
            'message', 'The status of "' || v_title || '" has been updated: ' || INITCAP(REPLACE(REPLACE(NEW.action, 'case_', ''), '_', ' ')),
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    IF NEW.action = 'client_visible_report_posted' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'New Legal Update',
            'message', 'Your legal team has posted a new update for "' || v_title || '".',
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    IF NEW.action = 'case_message_received' AND (NEW.metadata->>'sender_role') <> 'client' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'New Message',
            'message', 'You have a new message regarding "' || v_title || '".',
            'link', '/messages?matter=' || NEW.target_id
        ));
    END IF;

    IF NEW.action = 'invoice_paid' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'Payment Successful',
            'message', 'Your payment for ' || COALESCE(NEW.metadata->>'invoice_number', 'invoice') || ' has been received.',
            'link', '/billing'
        ));
    END IF;

    IF NEW.action = 'document_uploaded' AND (NEW.metadata->>'uploader_role') = 'staff' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'New Case Document',
            'message', 'A new document has been shared with you: ' || (NEW.metadata->>'title'),
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    -- 3. STAFF NOTIFICATIONS
    IF NEW.action = 'client_case_report_submitted' THEN
        FOR v_admin_cm IN 
            SELECT ufr.user_id 
            FROM public.user_firm_roles ufr
            WHERE (ufr.firm_id = NEW.firm_id OR NEW.firm_id IS NULL)
            AND ufr.status = 'active'
            AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
        LOOP
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'New Intake',
                'message', 'New case report: ' || v_title,
                'link', '/internal/intake/' || NEW.target_id
            ));
        END LOOP;
    END IF;

    IF NEW.action = 'case_assigned' THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (
            COALESCE((NEW.metadata->>'assignee_id'), (NEW.metadata->>'assignee'))::UUID, 
            NEW.action, 
            'in_app', 
            jsonb_build_object(
                'title', 'New Assignment',
                'message', 'You have been assigned to a new matter.',
                'link', '/internal/matters/' || NEW.target_id
            )
        );
    END IF;

    IF NEW.action IN ('report_submitted', 'under_review_report_posted') THEN
        SELECT assigned_case_manager INTO v_matter_cm FROM public.matters WHERE id = NEW.target_id;
        IF v_matter_cm IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_matter_cm, NEW.action, 'in_app', jsonb_build_object(
                'title', 'Report Awaiting Review',
                'message', 'A new report for "' || v_title || '" requires your approval.',
                'link', '/internal/matters/' || NEW.target_id
            ));
        END IF;
    END IF;

    IF NEW.action = 'case_message_received' AND (NEW.metadata->>'sender_role') = 'client' THEN
        FOR v_admin_cm IN 
            SELECT m.assigned_associate as user_id FROM public.matters m WHERE m.id = NEW.target_id AND m.assigned_associate IS NOT NULL
            UNION
            SELECT m.assigned_case_manager as user_id FROM public.matters m WHERE m.id = NEW.target_id AND m.assigned_case_manager IS NOT NULL
        LOOP
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'New Client Message',
                'message', 'The client for "' || v_title || '" sent a new message.',
                'link', '/internal/matters/' || NEW.target_id
            ));
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Realtime enabled for notifications and client_signup trigger added.' AS status;
