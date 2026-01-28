-- ========================================================
-- FIX NOTIFICATIONS & ASSIGNMENTS (ROBUST)
-- ========================================================

-- 1. FIX CASE ASSIGNMENTS SCHEMA (Ensure firm_id exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_assignments' AND column_name='firm_id') THEN
        ALTER TABLE public.case_assignments ADD COLUMN firm_id UUID REFERENCES public.firms(id);
    END IF;
END $$;

-- 2. UPDATE NOTIFICATIONS ENGINE (Defensive Coding)
CREATE OR REPLACE FUNCTION public.process_event_notifications()
RETURNS TRIGGER AS $$
DECLARE
    v_target_row RECORD;
    v_admin_cm RECORD;
    v_matter_cm UUID;
    v_assignee UUID;
BEGIN
    -- Event: case_assigned
    IF NEW.action = 'case_assigned' THEN
        -- Safe extraction of assignee
        BEGIN
            v_assignee := (NEW.metadata->>'assignee')::UUID;
        EXCEPTION WHEN OTHERS THEN
            v_assignee := NULL;
        END;

        IF v_assignee IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (
                v_assignee, 
                NEW.action, 
                'in_app', 
                jsonb_build_object(
                    'title', 'New Assignment',
                    'message', 'You have been assigned to a new case/matter.',
                    'link', '/internal/matters'
                )
            );
        END IF;
    END IF;

    -- EVENT: client_case_report_submitted
    IF NEW.action = 'client_case_report_submitted' THEN
        SELECT * INTO v_target_row FROM public.case_reports WHERE id = NEW.target_id;
        IF FOUND AND v_target_row.client_id IS NOT NULL THEN
             -- Notify Client
            INSERT INTO public.notifications (user_id, event_type, channel, payload)
            VALUES (v_target_row.client_id, NEW.action, 'email', jsonb_build_object(
                'title', 'Case Submission Received',
                'message', 'Your case report "' || v_target_row.title || '" has been successfully submitted.'
            ));

            -- Notify Firm (Handle NULL firm_id gracefully)
            FOR v_admin_cm IN 
                SELECT ufr.user_id 
                FROM public.user_firm_roles ufr
                WHERE (ufr.firm_id = NEW.firm_id OR (NEW.firm_id IS NULL AND ufr.firm_id IS NOT NULL)) -- Logic for global/specific
                AND ufr.status = 'active'
                AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
            LOOP
                INSERT INTO public.notifications (user_id, event_type, channel, payload)
                VALUES (v_admin_cm.user_id, NEW.action, 'in_app', jsonb_build_object(
                    'title', 'New Case Intake',
                    'message', 'A new case report has been submitted: ' || v_target_row.title,
                    'link', '/internal/intake/' || v_target_row.id
                ));
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ENSURE EVENT EMITTER IS CORRECT (Case Assignments)
CREATE OR REPLACE FUNCTION public.on_case_assigned()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure we emit the event with the correct metadata
    -- Also ensure we capture the firm_id if available
    PERFORM public.emit_case_event(
        'case_assigned', 
        NEW.target_id, 
        NEW.firm_id, -- Pass firm_id if column exists and is populated
        jsonb_build_object('assignee', NEW.assigned_to_user_id, 'role', NEW.assigned_role)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS trg_case_assigned ON public.case_assignments;
CREATE TRIGGER trg_case_assigned
AFTER INSERT ON public.case_assignments
FOR EACH ROW EXECUTE FUNCTION public.on_case_assigned();

SELECT '✅ Notifications System Hardened & Assignments Fixed' as status;
