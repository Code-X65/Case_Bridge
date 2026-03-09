-- ==========================================================
-- PHASE 15: REPORT APPROVAL WORKFLOW & NOTIFICATIONS
-- ==========================================================
-- Refines the notification system for progress reports:
-- 1. Associate submits -> Notify Case Manager (Status: under_review)
-- 2. Case Manager approves -> Notify Associate (Status: published)
-- 3. Case Manager marks visible -> Notify Client (Status: published, client_visible: TRUE)

CREATE OR REPLACE FUNCTION public.notify_report_workflow()
RETURNS TRIGGER AS $$
DECLARE
    v_matter_rec RECORD;
    v_author_name TEXT;
BEGIN
    -- Wrap in EXCEPTION block to never block the main transaction
    BEGIN
        SELECT m.title, m.client_id, m.firm_id, m.assigned_case_manager 
        INTO v_matter_rec 
        FROM public.matters m 
        WHERE m.id = NEW.matter_id;

        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        SELECT full_name INTO v_author_name 
        FROM public.profiles 
        WHERE id = NEW.author_id;

        -- CASE 1: NEW SUBMISSION (Associate -> Case Manager)
        IF (TG_OP = 'INSERT') THEN
            IF NEW.status = 'under_review' AND v_matter_rec.assigned_case_manager IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    v_matter_rec.assigned_case_manager, 
                    v_matter_rec.firm_id, 
                    'report_submitted', 
                    'New Report for Approval', 
                    'Associate ' || COALESCE(v_author_name, 'Lawyer') || ' submitted a report for "' || v_matter_rec.title || '".', 
                    NEW.matter_id
                );
            END IF;

            -- Also handle the case where a CM submits a published report directly (Client Notification)
            IF NEW.status = 'published' AND NEW.client_visible = TRUE AND v_matter_rec.client_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    v_matter_rec.client_id, 
                    v_matter_rec.firm_id, 
                    'report_approved', 
                    'Your Case Has an Update', 
                    'A new progress report "' || NEW.title || '" has been published.', 
                    NEW.matter_id
                );
            END IF;
        END IF;

        -- CASE 2: STATUS CHANGE / APPROVAL (Case Manager -> Associate & Client)
        IF (TG_OP = 'UPDATE') THEN
            -- Approval Notification to Associate
            IF NEW.status = 'published' AND OLD.status = 'under_review' AND NEW.author_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    NEW.author_id, 
                    v_matter_rec.firm_id, 
                    'report_approved', 
                    'Report Approved', 
                    'Your report "' || NEW.title || '" has been approved and published.', 
                    NEW.matter_id
                );
            END IF;

            -- Visibility Notification to Client
            IF NEW.client_visible = TRUE AND (OLD.client_visible = FALSE OR OLD.status != 'published') AND NEW.status = 'published' AND v_matter_rec.client_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    v_matter_rec.client_id, 
                    v_matter_rec.firm_id, 
                    'report_approved', 
                    'Your Case Has an Update', 
                    'A new progress report "' || NEW.title || '" has been published to your file.', 
                    NEW.matter_id
                );
            END IF;
        END IF;

    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Notification failed but report operation succeeded: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger for BOTH insert and update
DROP TRIGGER IF EXISTS trg_notify_report_update ON public.matter_updates;
CREATE TRIGGER trg_notify_report_workflow
AFTER INSERT OR UPDATE ON public.matter_updates
FOR EACH ROW
EXECUTE FUNCTION public.notify_report_workflow();

-- Ensure schema is reloaded
NOTIFY pgrst, 'reload schema';
SELECT '✅ Phase 15: Report Approval Workflow & Enhanced Notifications active' AS status;
