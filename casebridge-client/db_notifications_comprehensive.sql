-- ========================================================
-- COMPREHENSIVE NOTIFICATIONS SYSTEM
-- Expands on v1 engine to verify "all necessary messages"
-- ========================================================

-- 1. ENHANCED NOTIFICATION ROUTING
-- We redefine the processor to handle a broader set of events
CREATE OR REPLACE FUNCTION public.process_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_target_row RECORD;
    v_target_title TEXT;
    v_admin_cm RECORD;
    v_assignee UUID;
    v_firm_id UUID;
BEGIN
    -- ==========================================
    -- A. CLIENT EVENTS (Target = Client)
    -- ==========================================

    -- 1. Case Report Submitted (Handled in V1, reaffirming)
    IF NEW.action = 'client_case_report_submitted' THEN
        -- Notify Client
        SELECT * INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'email', jsonb_build_object(
                'title', 'Case Submission Received',
                'message', 'Your case report "' || v_target_row.title || '" has been received.',
                'link', '/client/cases/' || NEW.target_id
            ));

            -- Notify Firm Admins & CMs (Only if firm is attached)
            IF NEW.firm_id IS NOT NULL THEN
                FOR v_admin_cm IN 
                    SELECT user_id FROM public.user_firm_roles 
                    WHERE firm_id = NEW.firm_id
                    AND status = 'active' AND role IN ('admin_manager', 'case_manager')
                LOOP
                    INSERT INTO public.notifications (user_id, event_type, channel, payload)
                    VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                        'title', 'New Case Intake',
                        'message', 'New case submitted: ' || v_target_row.title,
                        'link', '/intake/' || v_target_row.id
                    ));
                END LOOP;
            END IF;
        END IF;
    END IF;

    -- 2. Invoice Paid (Client -> Firm)
    IF NEW.action = 'invoice_paid' THEN
        SELECT * INTO v_target_row FROM public.invoices WHERE id = NEW.target_id;
        v_firm_id := NEW.firm_id;
        
        -- Notify Client (Receipt) is handled by payment provider usually, but we can do in-app
        -- (Skipping Client notification for now to avoid spam, focusing on Firm)

        -- Notify Firm Admins & CMs
        FOR v_admin_cm IN 
            SELECT user_id FROM public.user_firm_roles 
            WHERE firm_id = v_firm_id AND status = 'active' AND role IN ('admin_manager', 'case_manager')
        LOOP
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'Payment Received',
                'message', 'Invoice #' || COALESCE(v_target_row.invoice_number, 'N/A') || ' has been paid.',
                'link', '/internal/billing'
            ));
        END LOOP;
    END IF;

    -- ==========================================
    -- B. STAFF EVENTS (Target = Internal Staff)
    -- ==========================================

    -- 3. Case Assigned (Internal)
    IF NEW.action = 'case_assigned' THEN
        v_assignee := (NEW.metadata->>'assignee_id')::UUID;
        v_target_title := NEW.metadata->>'case_title';
        
        IF v_assignee IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_assignee, NEW.action, 'in_app', jsonb_build_object(
                'title', 'New Assignment',
                'message', 'You have been assigned to case: ' || COALESCE(v_target_title, 'Unknown'),
                'link', '/internal/associate/matters'
            ));
        END IF;
    END IF;

    -- 4. Staff Joined (Invite Accepted)
    IF NEW.action = 'staff_accepted_invite' THEN
        -- Notify Admins Only
        FOR v_admin_cm IN 
            SELECT user_id FROM public.user_firm_roles 
            WHERE firm_id = NEW.firm_id AND status = 'active' AND role = 'admin_manager' AND user_id != NEW.actor_id 
        LOOP
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                'title', 'New Staff Member',
                'message', 'A new staff member has joined your firm.',
                'link', '/internal/staff'
            ));
        END LOOP;
    END IF;

    -- ==========================================
    -- C. HYBRID EVENTS (Documents & Status)
    -- ==========================================

    -- 5. Document Uploaded
    IF NEW.action = 'document_uploaded' THEN
        -- Payload expects: { "case_id": "...", "uploader_role": "client|staff", "is_client_visible": true/false, "title": "..." }
        
        -- If Client Uploaded -> Notify Assigned Staff & CM
        IF (NEW.metadata->>'uploader_role') = 'client' THEN
            -- Find CMs and Assignees for this case
            -- (Simplification: Notify all CMs for now, refined routing requires querying assignments)
             FOR v_admin_cm IN 
                SELECT user_id FROM public.user_firm_roles 
                WHERE firm_id = NEW.firm_id AND status = 'active' AND role = 'case_manager'
            LOOP
                INSERT INTO public.notifications (user_id, event_type, channel, payload)
                VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                    'title', 'Client Document',
                    'message', 'Client uploaded a document: ' || (NEW.metadata->>'title'),
                    'link', '/internal/intake/' || (NEW.metadata->>'case_id')
                ));
            END LOOP;
        
        -- If Staff Uploaded AND Client Visible -> Notify Client
        ELSIF (NEW.metadata->>'is_client_visible')::BOOLEAN = TRUE THEN
            -- Get Client ID from Case Report
             SELECT client_id INTO v_assignee -- reusing variable for client_id
             FROM public.case_reports WHERE id = (NEW.metadata->>'case_id')::UUID;
             
             IF v_assignee IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, event_type, channel, payload)
                VALUES (v_assignee, NEW.action, 'email', jsonb_build_object(
                    'title', 'New Case Document',
                    'message', 'A new document has been shared with you: ' || (NEW.metadata->>'title'),
                    'link', '/cases/' || (NEW.metadata->>'case_id')
                ));
             END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. TRIGGERS TO EMIT EVENTS
-- A. Invoice Paid
CREATE OR REPLACE FUNCTION public.emit_invoice_paid() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid' THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (
            auth.uid(), -- user who triggered payment processing OR system
            NEW.firm_id,
            'invoice_paid',
            NEW.id,
            jsonb_build_object('invoice_number', NEW.invoice_number, 'amount', NEW.amount)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_paid ON public.invoices;
CREATE TRIGGER trg_invoice_paid AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.emit_invoice_paid();

-- B. Document Uploaded (Case Report Documents)
CREATE OR REPLACE FUNCTION public.emit_document_upload() RETURNS TRIGGER AS $$
DECLARE
    v_cr RECORD;
    v_uploader_role TEXT;
    v_is_client BOOLEAN;
BEGIN
    SELECT * INTO v_cr FROM public.case_reports WHERE id = NEW.case_report_id;
    
    -- Determine if uploader is client
    v_is_client := (auth.uid() = v_cr.client_id);
    v_uploader_role := CASE WHEN v_is_client THEN 'client' ELSE 'staff' END;

    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (
        auth.uid(),
        v_cr.preferred_firm_id, -- assuming firm is linked here
        'document_uploaded',
        NEW.id,
        jsonb_build_object(
            'case_id', NEW.case_report_id,
            'title', NEW.file_name,
            'uploader_role', v_uploader_role,
            'is_client_visible', NEW.is_client_visible
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_doc_upload ON public.case_report_documents;
CREATE TRIGGER trg_doc_upload AFTER INSERT ON public.case_report_documents FOR EACH ROW EXECUTE FUNCTION public.emit_document_upload();


-- C. Case Assignment (Assignments Table)
CREATE OR REPLACE FUNCTION public.emit_assignment_event() RETURNS TRIGGER AS $$
DECLARE
    v_target_title TEXT;
    v_firm_id UUID;
BEGIN
    -- Get Title from Matter or Case Report
    IF NEW.target_type = 'matter' THEN
        SELECT title, firm_id INTO v_target_title, v_firm_id FROM public.matters WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'case_report' THEN
        SELECT title, preferred_firm_id INTO v_target_title, v_firm_id FROM public.case_reports WHERE id = NEW.target_id;
    END IF;

    INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
    VALUES (
        auth.uid(),
        v_firm_id,
        'case_assigned',
        NEW.id,
        jsonb_build_object(
            'assignee_id', NEW.assigned_to_user_id,
            'case_title', v_target_title,
            'target_type', NEW.target_type,
            'target_id', NEW.target_id
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assignment_audit ON public.case_assignments;
CREATE TRIGGER trg_assignment_audit AFTER INSERT ON public.case_assignments FOR EACH ROW EXECUTE FUNCTION public.emit_assignment_event();


SELECT '✅ Comprehensive Notification Triggers & Events Applied' as status;
