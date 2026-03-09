-- ==========================================
-- PHASE 9: ADVANCED WORKFLOWS & AUTOMATION
-- ==========================================

-- 1. Automated Intake Handoff Trigger
-- This function creates an initial research note with the case report summary
CREATE OR REPLACE FUNCTION public.fn_automate_matter_handoff()
RETURNS TRIGGER AS $$
DECLARE
    v_intake_title TEXT;
    v_intake_desc TEXT;
    v_category TEXT;
    v_content TEXT;
BEGIN
    IF NEW.case_report_id IS NOT NULL THEN
        -- Fetch intake details
        SELECT title, description, category INTO v_intake_title, v_intake_desc, v_category
        FROM public.case_reports
        WHERE id = NEW.case_report_id;

        -- Construct rich text content
        v_content := '<h3>Initial Case Handoff</h3>' ||
                    '<p><strong>Intake Category:</strong> ' || COALESCE(v_category, 'General') || '</p>' ||
                    '<p><strong>Original Description:</strong></p>' ||
                    '<blockquote>' || COALESCE(v_intake_desc, 'No description provided.') || '</blockquote>' ||
                    '<hr/>' ||
                    '<p><em>Note: This content was automatically synchronized from the intake report.</em></p>';

        -- Insert into research notes
        INSERT INTO public.matter_research_notes (
            matter_id,
            author_id,
            category,
            title,
            content,
            is_pinned
        ) VALUES (
            NEW.id,
            NEW.created_by,
            'internal_memo',
            'Intake Profile: ' || v_intake_title,
            v_content,
            true
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_automate_matter_handoff ON public.matters;
CREATE TRIGGER trg_automate_matter_handoff
AFTER INSERT ON public.matters
FOR EACH ROW EXECUTE FUNCTION public.fn_automate_matter_handoff();

-- 2. Legacy Notes Migration
-- Move existing internal_notes into matter_research_notes
DO $$
DECLARE
    m RECORD;
BEGIN
    FOR m IN SELECT id, internal_notes, created_by, created_at FROM public.matters WHERE internal_notes IS NOT NULL AND internal_notes != '' LOOP
        INSERT INTO public.matter_research_notes (
            matter_id,
            author_id,
            category,
            title,
            content,
            created_at
        ) VALUES (
            m.id,
            m.created_by,
            'internal_memo',
            'Migrated Legacy Note',
            '<p>' || m.internal_notes || '</p>',
            m.created_at
        );
    END LOOP;
    
    -- Nullify old notes to prevent double migration if script is re-run (though table is usually recreated in this dev env)
    -- ALTER TABLE public.matters DROP COLUMN internal_notes; -- We'll keep it for now but NULL the data
    UPDATE public.matters SET internal_notes = NULL WHERE internal_notes IS NOT NULL;
END $$;

-- 3. Automated Deadline Reminders
-- This function can be called via cron/pg_cron or manually verified
CREATE OR REPLACE FUNCTION public.fn_trigger_deadline_reminders()
RETURNS VOID AS $$
DECLARE
    d RECORD;
BEGIN
    -- Find deadlines in 48h or 7 days that haven't been reminded
    FOR d IN (
        SELECT md.id, md.title, md.deadline_date, md.matter_id, m.firm_id, m.assigned_associate, m.assigned_case_manager
        FROM public.matter_deadlines md
        JOIN public.matters m ON md.matter_id = m.id
        WHERE md.status = 'active'
        AND md.reminder_sent = false
        AND (
            (md.deadline_date::DATE = (CURRENT_DATE + INTERVAL '2 days')::DATE)
            OR
            (md.deadline_date::DATE = (CURRENT_DATE + INTERVAL '7 days')::DATE)
        )
    ) LOOP
        -- Notify Associate
        IF d.assigned_associate IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, firm_id, title, content, type, status)
            VALUES (
                d.assigned_associate,
                d.firm_id,
                'Upcoming Deadline: ' || d.title,
                'Deadline is approaching on ' || TO_CHAR(d.deadline_date, 'Mon DD, YYYY') || '.',
                'deadline_reminder',
                'unread'
            );
        END IF;

        -- Notify Case Manager
        IF d.assigned_case_manager IS NOT NULL AND d.assigned_case_manager != d.assigned_associate THEN
            INSERT INTO public.notifications (user_id, firm_id, title, content, type, status)
            VALUES (
                d.assigned_case_manager,
                d.firm_id,
                'Matter Deadline Alert',
                'Matter "' || d.title || '" has a deadline on ' || TO_CHAR(d.deadline_date, 'Mon DD, YYYY') || '.',
                'deadline_reminder',
                'unread'
            );
        END IF;

        -- Update reminder status
        UPDATE public.matter_deadlines SET reminder_sent = true WHERE id = d.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Advanced Automation Logic Applied' AS status;
