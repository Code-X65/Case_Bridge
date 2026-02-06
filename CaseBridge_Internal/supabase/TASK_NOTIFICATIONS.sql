-- AUTO-NOTIFICATIONS FOR TASK ASSIGNMENT AND COMPLETION
-- Using public.create_notification for better schema resilience

-- 1. Function: Notify User When Task is Assigned or Made Client-Visible
CREATE OR REPLACE FUNCTION public.notify_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    matter_rec RECORD;
BEGIN
    SELECT title, firm_id, client_id, assigned_case_manager INTO matter_rec 
    FROM public.matters WHERE id = NEW.matter_id;

    -- A. INTERNAL: Notify Assigned Staff
    IF (NEW.assigned_to_id IS NOT NULL AND (OLD IS NULL OR OLD.assigned_to_id IS NULL OR OLD.assigned_to_id != NEW.assigned_to_id)) THEN
        PERFORM public.create_notification(
            NEW.assigned_to_id,
            'task_assigned',
            'Deployment Alert',
            'You have been assigned the objective "' || NEW.title || '" in Case: ' || matter_rec.title,
            NEW.matter_id,
            NULL,
            jsonb_build_object('link', '/internal/associate/tasks')
        );
    END IF;

    -- B. CLIENT: Notify if Task becomes Visible to Client
    IF (NEW.is_client_visible = TRUE AND (OLD IS NULL OR OLD.is_client_visible = FALSE)) THEN
        PERFORM public.create_notification(
            matter_rec.client_id,
            'client_action_required',
            'New Action Item',
            'Our team has shared a required task for your review in "' || matter_rec.title || '".',
            NEW.matter_id,
            NULL,
            jsonb_build_object('link', '/cases/' || NEW.matter_id)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Assignment/Visibility
DROP TRIGGER IF EXISTS trigger_notify_task_changes ON public.matter_tasks;
CREATE TRIGGER trigger_notify_task_changes
AFTER INSERT OR UPDATE OF assigned_to_id, is_client_visible ON public.matter_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_changes();


-- 2. Function: Notify Stakeholders When Task is Completed
CREATE OR REPLACE FUNCTION public.notify_task_completion()
RETURNS TRIGGER AS $$
DECLARE
    matter_rec RECORD;
BEGIN
    -- Only trigger when status changes to 'completed'
    IF (NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed')) THEN
        
        SELECT title, firm_id, client_id, assigned_case_manager INTO matter_rec 
        FROM public.matters WHERE id = NEW.matter_id;

        -- A. INTERNAL: Notify the Task Creator (Feedback Loop)
        IF (NEW.created_by_id IS NOT NULL) THEN
            PERFORM public.create_notification(
                NEW.created_by_id,
                'task_completed',
                'Objective Secured',
                'The task "' || NEW.title || '" has been finalized for Case: ' || matter_rec.title,
                NEW.matter_id,
                NULL,
                jsonb_build_object('link', '/internal/matter/' || NEW.matter_id)
            );
        END IF;

        -- B. INTERNAL: Notify the Case Manager (Supervision)
        IF (matter_rec.assigned_case_manager IS NOT NULL AND matter_rec.assigned_case_manager != NEW.created_by_id) THEN
            PERFORM public.create_notification(
                matter_rec.assigned_case_manager,
                'task_completed',
                'Workflow Progression',
                'Objective "' || NEW.title || '" is now complete for Case: ' || matter_rec.title,
                NEW.matter_id,
                NULL,
                jsonb_build_object('link', '/internal/matter/' || NEW.matter_id)
            );
        END IF;

        -- C. CLIENT: Notify if the task was client-visible
        IF (NEW.is_client_visible = TRUE) THEN
            PERFORM public.create_notification(
                matter_rec.client_id,
                'progress_update',
                'Milestone Reached',
                'The task "' || NEW.title || '" has been completed by your legal team.',
                NEW.matter_id,
                NULL,
                jsonb_build_object('link', '/cases/' || NEW.matter_id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Completion
DROP TRIGGER IF EXISTS trigger_notify_task_completion ON public.matter_tasks;
CREATE TRIGGER trigger_notify_task_completion
AFTER UPDATE OF status ON public.matter_tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_completion();


