-- ============================================================================
-- CASE MANAGER NOTIFICATION SYSTEM
-- ============================================================================
-- This migration implements a comprehensive notification system that delivers
-- notifications ONLY to users with the 'case_manager' role.
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Recipient (Case Manager only)
    recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_role TEXT NOT NULL CHECK (recipient_role = 'case_manager'),
    
    -- Event details
    event_type TEXT NOT NULL,
    event_category TEXT NOT NULL CHECK (event_category IN (
        'case_lifecycle',
        'court_legal',
        'documentation',
        'team_activity',
        'system_compliance'
    )),
    
    -- Related entities
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    case_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    triggered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    
    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Priority and urgency
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    
    -- State tracking
    read_at TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT notifications_recipient_check CHECK (
        recipient_role = 'case_manager'
    )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(recipient_user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_case ON public.notifications(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_firm ON public.notifications(firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON public.notifications(event_type);

-- ============================================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Case Managers can view their own notifications
DROP POLICY IF EXISTS "Case managers can view their notifications" ON public.notifications;
CREATE POLICY "Case managers can view their notifications"
ON public.notifications FOR SELECT
USING (
    recipient_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role = 'case_manager'
        AND status = 'active'
    )
);

-- Case Managers can mark their notifications as read
DROP POLICY IF EXISTS "Case managers can update their notifications" ON public.notifications;
CREATE POLICY "Case managers can update their notifications"
ON public.notifications FOR UPDATE
USING (
    recipient_user_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role = 'case_manager'
        AND status = 'active'
    )
)
WITH CHECK (
    recipient_user_id = auth.uid()
);

-- System can insert notifications (via functions)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    recipient_role = 'case_manager'
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = recipient_user_id
        AND internal_role = 'case_manager'
        AND status = 'active'
    )
);

-- ============================================================================
-- 3. NOTIFICATION EVENT TYPES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_event_types (
    event_type TEXT PRIMARY KEY,
    event_category TEXT NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    default_priority TEXT DEFAULT 'normal',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed notification event types
INSERT INTO public.notification_event_types (event_type, event_category, title_template, message_template, default_priority, description) VALUES
    -- Case Lifecycle
    ('case_created', 'case_lifecycle', 'New Case Created', 'A new case "{case_title}" has been created by {actor_name}', 'normal', 'Triggered when a new case is created'),
    ('case_assigned', 'case_lifecycle', 'Case Assigned', 'Case "{case_title}" has been assigned to {assignee_name}', 'normal', 'Triggered when a case is assigned to an associate'),
    ('case_status_changed', 'case_lifecycle', 'Case Status Updated', 'Case "{case_title}" status changed from {old_status} to {new_status}', 'normal', 'Triggered when case status changes'),
    ('case_priority_changed', 'case_lifecycle', 'Case Priority Updated', 'Case "{case_title}" priority changed to {new_priority}', 'high', 'Triggered when case priority changes'),
    ('case_deadline_updated', 'case_lifecycle', 'Deadline Updated', 'Deadline for case "{case_title}" has been updated to {new_deadline}', 'high', 'Triggered when case deadline changes'),
    ('case_closed', 'case_lifecycle', 'Case Closed', 'Case "{case_title}" has been closed', 'normal', 'Triggered when a case is closed'),
    
    -- Court & Legal Events
    ('court_report_submitted', 'court_legal', 'Court Report Submitted', 'New court report submitted for case "{case_title}" by {actor_name}', 'high', 'Triggered when court report is submitted'),
    ('court_report_updated', 'court_legal', 'Court Report Updated', 'Court report for case "{case_title}" has been updated', 'normal', 'Triggered when court report is modified'),
    ('hearing_scheduled', 'court_legal', 'Hearing Scheduled', 'Hearing scheduled for case "{case_title}" on {hearing_date}', 'urgent', 'Triggered when hearing is scheduled'),
    ('hearing_rescheduled', 'court_legal', 'Hearing Rescheduled', 'Hearing for case "{case_title}" rescheduled to {new_date}', 'urgent', 'Triggered when hearing date changes'),
    ('hearing_cancelled', 'court_legal', 'Hearing Cancelled', 'Hearing for case "{case_title}" has been cancelled', 'high', 'Triggered when hearing is cancelled'),
    ('judgment_recorded', 'court_legal', 'Judgment Recorded', 'Judgment recorded for case "{case_title}"', 'urgent', 'Triggered when judgment is entered'),
    
    -- Documentation & Evidence
    ('document_uploaded', 'documentation', 'Document Added', 'New document "{document_name}" added to case "{case_title}"', 'normal', 'Triggered when document is uploaded'),
    ('document_updated', 'documentation', 'Document Updated', 'Document "{document_name}" in case "{case_title}" has been updated', 'low', 'Triggered when document is modified'),
    ('document_deleted', 'documentation', 'Document Removed', 'Document "{document_name}" removed from case "{case_title}"', 'normal', 'Triggered when document is deleted'),
    ('evidence_added', 'documentation', 'Evidence Added', 'New evidence added to case "{case_title}"', 'high', 'Triggered when evidence is uploaded'),
    ('filing_submitted', 'documentation', 'Filing Submitted', 'Court filing submitted for case "{case_title}"', 'high', 'Triggered when filing is submitted'),
    
    -- Team Activity
    ('associate_update', 'team_activity', 'Associate Update', '{actor_name} submitted an update on case "{case_title}"', 'normal', 'Triggered when associate adds update'),
    ('case_note_added', 'team_activity', 'Note Added', 'New note added to case "{case_title}" by {actor_name}', 'low', 'Triggered when case note is created'),
    ('case_reassigned', 'team_activity', 'Case Reassigned', 'Case "{case_title}" reassigned from {old_assignee} to {new_assignee}', 'high', 'Triggered when case is reassigned'),
    ('case_escalated', 'team_activity', 'Case Escalated', 'Case "{case_title}" has been escalated', 'urgent', 'Triggered when case is escalated'),
    ('case_mentioned', 'team_activity', 'You Were Mentioned', '{actor_name} mentioned you in case "{case_title}"', 'normal', 'Triggered when case manager is mentioned'),
    
    -- System & Compliance
    ('deadline_approaching', 'system_compliance', 'Deadline Approaching', 'Case "{case_title}" deadline is in {days_remaining} days', 'urgent', 'Triggered when deadline is near'),
    ('deadline_missed', 'system_compliance', 'Deadline Missed', 'Case "{case_title}" has missed its deadline', 'urgent', 'Triggered when deadline is passed'),
    ('sla_breach', 'system_compliance', 'SLA Breach', 'Case "{case_title}" has breached SLA requirements', 'urgent', 'Triggered when SLA is violated'),
    ('compliance_alert', 'system_compliance', 'Compliance Alert', 'Compliance issue detected for case "{case_title}"', 'urgent', 'Triggered for compliance issues'),
    ('case_flagged', 'system_compliance', 'Case Flagged', 'Case "{case_title}" has been flagged as high-risk', 'urgent', 'Triggered when case is flagged')
ON CONFLICT (event_type) DO UPDATE SET
    event_category = EXCLUDED.event_category,
    title_template = EXCLUDED.title_template,
    message_template = EXCLUDED.message_template,
    default_priority = EXCLUDED.default_priority,
    description = EXCLUDED.description;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to create notification for all case managers in a firm
CREATE OR REPLACE FUNCTION public.create_notification_for_case_managers(
    p_firm_id UUID,
    p_event_type TEXT,
    p_case_id UUID DEFAULT NULL,
    p_triggered_by UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_config RECORD;
    v_title TEXT;
    v_message TEXT;
    v_priority TEXT;
    v_notifications_created INTEGER := 0;
    v_case_title TEXT;
    v_actor_name TEXT;
BEGIN
    -- Get event configuration
    SELECT * INTO v_event_config
    FROM public.notification_event_types
    WHERE event_type = p_event_type;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown event type: %', p_event_type;
    END IF;
    
    -- Get case title if case_id provided
    IF p_case_id IS NOT NULL THEN
        SELECT title INTO v_case_title FROM public.matters WHERE id = p_case_id;
    END IF;
    
    -- Get actor name if triggered_by provided
    IF p_triggered_by IS NOT NULL THEN
        SELECT first_name || ' ' || last_name INTO v_actor_name
        FROM public.profiles WHERE id = p_triggered_by;
    END IF;
    
    -- Build title and message from templates
    v_title := v_event_config.title_template;
    v_message := v_event_config.message_template;
    
    -- Replace placeholders
    v_title := replace(v_title, '{case_title}', COALESCE(v_case_title, 'Unknown'));
    v_message := replace(v_message, '{case_title}', COALESCE(v_case_title, 'Unknown'));
    v_message := replace(v_message, '{actor_name}', COALESCE(v_actor_name, 'System'));
    
    -- Replace metadata placeholders
    IF p_metadata ? 'old_status' THEN
        v_message := replace(v_message, '{old_status}', p_metadata->>'old_status');
    END IF;
    IF p_metadata ? 'new_status' THEN
        v_message := replace(v_message, '{new_status}', p_metadata->>'new_status');
    END IF;
    IF p_metadata ? 'assignee_name' THEN
        v_message := replace(v_message, '{assignee_name}', p_metadata->>'assignee_name');
    END IF;
    IF p_metadata ? 'new_priority' THEN
        v_message := replace(v_message, '{new_priority}', p_metadata->>'new_priority');
    END IF;
    IF p_metadata ? 'new_deadline' THEN
        v_message := replace(v_message, '{new_deadline}', p_metadata->>'new_deadline');
    END IF;
    IF p_metadata ? 'document_name' THEN
        v_message := replace(v_message, '{document_name}', p_metadata->>'document_name');
    END IF;
    IF p_metadata ? 'hearing_date' THEN
        v_message := replace(v_message, '{hearing_date}', p_metadata->>'hearing_date');
    END IF;
    IF p_metadata ? 'days_remaining' THEN
        v_message := replace(v_message, '{days_remaining}', p_metadata->>'days_remaining');
    END IF;
    
    -- Get priority (use metadata override if provided, otherwise use default)
    v_priority := COALESCE(p_metadata->>'priority', v_event_config.default_priority);
    
    -- Create notification for each active case manager in the firm
    INSERT INTO public.notifications (
        recipient_user_id,
        recipient_role,
        event_type,
        event_category,
        firm_id,
        case_id,
        triggered_by,
        title,
        message,
        metadata,
        priority
    )
    SELECT
        p.id,
        'case_manager',
        p_event_type,
        v_event_config.event_category,
        p_firm_id,
        p_case_id,
        p_triggered_by,
        v_title,
        v_message,
        p_metadata,
        v_priority
    FROM public.profiles p
    WHERE p.firm_id = p_firm_id
    AND p.internal_role = 'case_manager'
    AND p.status = 'active';
    
    GET DIAGNOSTICS v_notifications_created = ROW_COUNT;
    
    RETURN v_notifications_created;
END;
$$;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET read_at = NOW()
    WHERE id = p_notification_id
    AND recipient_user_id = auth.uid()
    AND read_at IS NULL;
    
    RETURN FOUND;
END;
$$;

-- Function to mark all notifications as read for current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.notifications
    SET read_at = NOW()
    WHERE recipient_user_id = auth.uid()
    AND read_at IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Function to archive notification
CREATE OR REPLACE FUNCTION public.archive_notification(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notifications
    SET archived_at = NOW()
    WHERE id = p_notification_id
    AND recipient_user_id = auth.uid();
    
    RETURN FOUND;
END;
$$;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.notifications
    WHERE recipient_user_id = auth.uid()
    AND read_at IS NULL
    AND archived_at IS NULL;
    
    RETURN v_count;
END;
$$;

-- ============================================================================
-- 5. TRIGGERS FOR AUTOMATIC NOTIFICATIONS
-- ============================================================================

-- Trigger for case status changes
CREATE OR REPLACE FUNCTION public.notify_case_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM public.create_notification_for_case_managers(
            NEW.firm_id,
            'case_status_changed',
            NEW.id,
            auth.uid(),
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_case_status_change ON public.matters;
CREATE TRIGGER trigger_notify_case_status_change
AFTER UPDATE ON public.matters
FOR EACH ROW
EXECUTE FUNCTION public.notify_case_status_change();

-- Trigger for case assignments
CREATE OR REPLACE FUNCTION public.notify_case_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_matter RECORD;
    v_assignee_name TEXT;
BEGIN
    -- Get matter details
    SELECT * INTO v_matter FROM public.matters WHERE id = NEW.matter_id;
    
    -- Get assignee name
    SELECT first_name || ' ' || last_name INTO v_assignee_name
    FROM public.profiles WHERE id = NEW.associate_id;
    
    PERFORM public.create_notification_for_case_managers(
        v_matter.firm_id,
        'case_assigned',
        NEW.matter_id,
        NEW.assigned_by,
        jsonb_build_object(
            'assignee_name', v_assignee_name,
            'assignee_id', NEW.associate_id
        )
    );
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_case_assignment ON public.case_assignments;
CREATE TRIGGER trigger_notify_case_assignment
AFTER INSERT ON public.case_assignments
FOR EACH ROW
EXECUTE FUNCTION public.notify_case_assignment();

-- ============================================================================
-- 6. VIEWS FOR EASY QUERYING
-- ============================================================================

-- View for unread notifications
CREATE OR REPLACE VIEW public.unread_notifications AS
SELECT 
    n.*,
    p.first_name || ' ' || p.last_name as triggered_by_name,
    m.title as case_title,
    m.matter_number
FROM public.notifications n
LEFT JOIN public.profiles p ON p.id = n.triggered_by
LEFT JOIN public.matters m ON m.id = n.case_id
WHERE n.recipient_user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
AND n.read_at IS NULL
AND n.archived_at IS NULL
ORDER BY n.created_at DESC;

-- View for recent notifications
CREATE OR REPLACE VIEW public.recent_notifications AS
SELECT 
    n.*,
    p.first_name || ' ' || p.last_name as triggered_by_name,
    m.title as case_title,
    m.matter_number
FROM public.notifications n
LEFT JOIN public.profiles p ON p.id = n.triggered_by
LEFT JOIN public.matters m ON m.id = n.case_id
WHERE n.recipient_user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID)
AND n.archived_at IS NULL
ORDER BY n.created_at DESC
LIMIT 50;

-- ============================================================================
-- SCHEMA REFRESH
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the setup)
-- ============================================================================

-- 1. Check notification event types
-- SELECT * FROM public.notification_event_types ORDER BY event_category, event_type;

-- 2. Get unread notification count
-- SELECT public.get_unread_notification_count();

-- 3. View recent notifications
-- SELECT * FROM public.recent_notifications;

-- 4. Test creating a notification
-- SELECT public.create_notification_for_case_managers(
--     'your-firm-id'::UUID,
--     'case_created',
--     'your-case-id'::UUID,
--     auth.uid(),
--     '{}'::JSONB
-- );
