-- ========================================================
-- CASE REPORTING & ACTIVITY TIMELINE SCHEMA V1
-- ========================================================

-- 1. Ensure Audit Logs supports Timeline Metadata
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='actor_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_id UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='target_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN target_id UUID; -- General ID for the subject (Matter, Case, etc)
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='audit_logs' AND column_name='metadata') THEN
        ALTER TABLE public.audit_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Refine log_firm_event to be the timeline engine
CREATE OR REPLACE FUNCTION public.log_firm_event(
    p_firm_id uuid,
    p_action text,
    p_target_id uuid default null,
    p_metadata jsonb default '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
  VALUES (auth.uid(), p_firm_id, p_action, p_target_id, p_metadata);
END;
$$;

-- 3. Automatic Lifecycle Timeline Triggers

-- A: Case Review Started (Submitted -> Under Review)
-- B: Case Closed (In Progress -> Closed)
CREATE OR REPLACE FUNCTION public.audit_matter_lifecycle_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log on actual transitions
    IF (OLD.lifecycle_state IS DISTINCT FROM NEW.lifecycle_state) THEN
        
        -- Event: case_review_started
        IF (OLD.lifecycle_state = 'submitted' AND NEW.lifecycle_state = 'under_review') THEN
             PERFORM public.log_firm_event(NEW.firm_id, 'case_review_started', NEW.id);
        END IF;

        -- Event: case_closed
        IF (NEW.lifecycle_state = 'closed') THEN
             PERFORM public.log_firm_event(NEW.firm_id, 'case_closed', NEW.id);
        END IF;

    END IF;

    -- Event: case_assigned
    IF (OLD.assigned_associate IS DISTINCT FROM NEW.assigned_associate AND NEW.assigned_associate IS NOT NULL) THEN
        PERFORM public.log_firm_event(NEW.firm_id, 'case_assigned', NEW.id, jsonb_build_object('assignee_id', NEW.assigned_associate));
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_matter_lifecycle ON public.matters;
CREATE TRIGGER trg_audit_matter_lifecycle
AFTER UPDATE ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.audit_matter_lifecycle_events();

-- 4. Report Event Trigger (already exists in db_matter_reports.sql, let's update it to be precise)
CREATE OR REPLACE FUNCTION public.handle_report_submission_logic()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
    v_current_state public.matter_lifecycle_state;
    v_firm_id uuid;
    v_event text;
begin
    -- Get matter info
    SELECT lifecycle_state, firm_id INTO v_current_state, v_firm_id
    FROM public.matters WHERE id = NEW.matter_id;

    -- Event determination
    v_event := CASE WHEN NEW.is_final THEN 'final_report_submitted' ELSE 'report_submitted' END;

    -- Timeline entry
    PERFORM public.log_firm_event(v_firm_id, v_event, NEW.matter_id, jsonb_build_object('report_id', NEW.id));

    -- Lifecycle Trigger: First report moves it to In Progress
    IF v_current_state = 'under_review' THEN
        PERFORM public.transition_matter_lifecycle(NEW.matter_id, 'in_progress');
    END IF;

    RETURN NEW;
end;
$$;

-- 5. Case Accepted Event (Log when Matter is first created)
CREATE OR REPLACE FUNCTION public.audit_matter_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.log_firm_event(NEW.firm_id, 'case_accepted', NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_matter_creation ON public.matters;
CREATE TRIGGER trg_audit_matter_creation
AFTER INSERT ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.audit_matter_creation();

SELECT '✅ Activity Timeline V1 System Applied' as status;
