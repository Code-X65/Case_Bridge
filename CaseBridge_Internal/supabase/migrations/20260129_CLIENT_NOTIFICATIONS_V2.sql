-- ========================================================
-- NOTIFICATIONS ENGINE v1.2 (CLIENT FOCUS)
-- ========================================================
-- Ensures clients receive in-app notifications for all relevant dashboard events.

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
    -- 1. IDENTIFY THE CLIENT AND CONTEXT
    -- Check if target is a Matter
    SELECT id, client_id, title, case_report_id INTO v_target_row FROM public.matters WHERE id = NEW.target_id;
    
    IF FOUND THEN
        v_client_id := v_target_row.client_id;
        v_title := v_target_row.title;
        v_case_report_id := v_target_row.case_report_id;
    ELSE
        -- Check if target is a Case Report
        SELECT id, client_id, title INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND THEN
            v_client_id := v_target_row.client_id;
            v_title := v_target_row.title;
            v_case_report_id := v_target_row.id;
        END IF;
    END IF;

    -- Handle Invoices (different mapping)
    IF NEW.action = 'invoice_paid' THEN
        SELECT client_id INTO v_client_id FROM public.invoices WHERE id = NEW.target_id;
    END IF;

    -- Handle Document Uploads (Staff -> Client)
    IF NEW.action = 'document_uploaded' THEN
        IF (NEW.metadata->>'is_client_visible')::BOOLEAN = TRUE AND (NEW.metadata->>'uploader_role') = 'staff' THEN
            SELECT client_id, title INTO v_target_row FROM public.case_reports WHERE id = (NEW.metadata->>'case_id')::UUID;
            v_client_id := v_target_row.client_id;
            v_title := v_target_row.title;
            v_case_report_id := v_target_row.id;
        END IF;
    END IF;

    -- 2. CLIENT NOTIFICATIONS (IN-APP)
    
    -- Event: Case Submitted
    IF NEW.action = 'client_case_report_submitted' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'Case Submitted',
            'message', 'Your report "' || v_title || '" has been successfully filed.',
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    -- Event: Status Updates
    IF NEW.action IN ('case_review_started', 'case_accepted', 'case_rejected', 'case_closed') AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'Case Status Update',
            'message', 'The status of "' || v_title || '" has been updated: ' || INITCAP(REPLACE(REPLACE(NEW.action, 'case_', ''), '_', ' ')),
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    -- Event: New Progress Report (Client Visible)
    IF NEW.action = 'client_visible_report_posted' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'New Legal Update',
            'message', 'Your legal team has posted a new update for "' || v_title || '".',
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    -- Event: New Message
    IF NEW.action = 'case_message_received' AND (NEW.metadata->>'sender_role') <> 'client' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'New Message',
            'message', 'You have a new message regarding "' || v_title || '".',
            'link', '/messages?matter=' || NEW.target_id
        ));
    END IF;

    -- Event: Invoice Paid
    IF NEW.action = 'invoice_paid' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'Payment Successful',
            'message', 'Your payment for ' || COALESCE(NEW.metadata->>'invoice_number', 'invoice') || ' has been received.',
            'link', '/billing'
        ));
    END IF;

    -- Event: New Document Shared
    IF NEW.action = 'document_uploaded' AND (NEW.metadata->>'uploader_role') = 'staff' AND v_client_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (v_client_id, NEW.action, 'in_app', jsonb_build_object(
            'title', 'New Case Document',
            'message', 'A new document has been shared with you: ' || (NEW.metadata->>'title'),
            'link', '/cases/' || v_case_report_id
        ));
    END IF;

    -- 3. STAFF NOTIFICATIONS (IN-APP)
    
    -- Event: New Case for Firm
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

    -- Event: Case Assigned to Lawyer
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

    -- Event: Lawyer Submitted Report (Notify CM)
    IF NEW.action = 'report_submitted' THEN
        SELECT assigned_case_manager INTO v_matter_cm FROM public.matters WHERE id = NEW.target_id;
        IF v_matter_cm IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_matter_cm, NEW.action, 'in_app', jsonb_build_object(
                'title', 'Legal Update Posted',
                'message', 'A lawyer has filed a report for "' || v_title || '".',
                'link', '/internal/matters/' || NEW.target_id
            ));
        END IF;
    END IF;

    -- Event: Message from Client
    IF NEW.action = 'case_message_received' AND (NEW.metadata->>'sender_role') = 'client' THEN
        -- Notify Assigned Associate and Case Manager
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

SELECT '✅ Notifications Engine v1.2 (Multi-Channel) Applied' AS status;
