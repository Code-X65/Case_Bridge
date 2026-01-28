-- ========================================================
-- CLIENT NOTIFICATIONS ENHANCEMENTS v1
-- ========================================================

-- Update Notification Routing Engine to include in-app for clients
CREATE OR REPLACE FUNCTION public.process_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_target_row RECORD;
    v_admin_cm RECORD;
    v_matter RECORD;
BEGIN
    -- 1. Lifecycle Events (Notify Client In-App)
    
    -- Event: client_case_report_submitted
    IF NEW.action = 'client_case_report_submitted' THEN
        SELECT * INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND THEN
            -- Notify Client (In-App)
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'Case Submitted',
                'message', 'We have received your case report "' || v_target_row.title || '". Our team will review it shortly.',
                'link', '/cases/' || v_target_row.id
            ));
            
            -- Notify Client (Email)
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'email', jsonb_build_object(
                'title', 'Case Submission Received',
                'message', 'Your case report "' || v_target_row.title || '" has been successfully submitted.'
            ));

            -- Internal Notify Admin & CM (In-app)
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

    -- Event: case_assigned (Notify Assignee)
    IF NEW.action = 'case_assigned' THEN
        INSERT INTO public.notifications (user_id, event_type, channel, payload)
        VALUES (
            (NEW.metadata->>'assignee_id')::UUID, 
            NEW.action, 
            'in_app', 
            jsonb_build_object(
                'title', 'New Assignment',
                'message', 'You have been assigned to a new matter.',
                'link', '/internal/cases/' || NEW.target_id
            )
        );
    END IF;

    -- Event: status updates (Notify Client In-App & Email)
    IF NEW.action IN ('case_review_started', 'case_accepted', 'case_rejected', 'case_closed') THEN
        SELECT * INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND THEN
            -- In-App
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'Status Updated',
                'message', 'Your case "' || v_target_row.title || '" is now: ' || REPLACE(NEW.action, 'case_', ''),
                'link', '/cases/' || v_target_row.id
            ));
            -- Email
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'email', jsonb_build_object(
                'title', 'Case Status Update',
                'message', 'The status of your case "' || v_target_row.title || '" has been updated.'
            ));
        END IF;
    END IF;

    -- 2. Client Interaction Events
    
    -- Event: client_visible_report_posted (Notify Client In-App)
    IF NEW.action = 'client_visible_report_posted' THEN
        SELECT m.client_id, m.title INTO v_matter FROM public.matters m WHERE m.id = NEW.target_id;
        IF FOUND THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_matter.client_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'New Professional Update',
                'message', 'A new update has been posted to your matter: ' || v_matter.title,
                'link', '/cases/' || (SELECT case_report_id FROM public.matters WHERE id = NEW.target_id)
            ));
        END IF;
    END IF;

    -- Event: case_message_received (Notify Client/Lawyer)
    IF NEW.action = 'case_message_received' THEN
        SELECT m.client_id, m.title, m.assigned_associate, m.assigned_case_manager 
        INTO v_matter FROM public.matters m WHERE m.id = NEW.target_id;
        
        IF FOUND THEN
            -- If sender is staff, notify client
            IF NEW.metadata->>'sender_role' != 'client' THEN
                INSERT INTO public.notifications (user_id, event_type, channel, payload)
                VALUES (v_matter.client_id, NEW.action, 'in_app', jsonb_build_object(
                    'title', 'New Message Received',
                    'message', 'You have a new message regarding matter: ' || v_matter.title,
                    'link', '/notifications?case=' || NEW.target_id -- Actually maybe link to the message section?
                ));
            -- If sender is client, notify assigned staff
            ELSE
                -- Notify Associate
                IF v_matter.assigned_associate IS NOT NULL THEN
                    INSERT INTO public.notifications (user_id, event_type, channel, payload)
                    VALUES (v_matter.assigned_associate, NEW.action, 'in_app', jsonb_build_object(
                        'title', 'Client Message',
                        'message', 'Your client sent a message regarding: ' || v_matter.title,
                        'link', '/internal/cases/' || NEW.target_id
                    ));
                END IF;
                -- Notify CM
                IF v_matter.assigned_case_manager IS NOT NULL THEN
                    INSERT INTO public.notifications (user_id, event_type, channel, payload)
                    VALUES (v_matter.assigned_case_manager, NEW.action, 'in_app', jsonb_build_object(
                        'title', 'Client Message',
                        'message', 'A client sent a message on a matter under your supervision.',
                        'link', '/internal/cases/' || NEW.target_id
                    ));
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Client-Enhanced Notifications Engine Applied' AS status;
