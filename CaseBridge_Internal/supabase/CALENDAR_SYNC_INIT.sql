-- 1. Ensure Case Meetings has all required columns (Addressing Error 42703)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'lawyer_user_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN lawyer_user_id UUID REFERENCES auth.users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'case_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN case_id UUID REFERENCES public.matters(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'meeting_type') THEN
        ALTER TABLE public.case_meetings ADD COLUMN meeting_type TEXT DEFAULT 'virtual';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'video_meeting_link') THEN
        ALTER TABLE public.case_meetings ADD COLUMN video_meeting_link TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'video_provider') THEN
        ALTER TABLE public.case_meetings ADD COLUMN video_provider TEXT DEFAULT 'zoom';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'confirmed_start') THEN
        ALTER TABLE public.case_meetings ADD COLUMN confirmed_start TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'confirmed_end') THEN
        ALTER TABLE public.case_meetings ADD COLUMN confirmed_end TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'client_note') THEN
        ALTER TABLE public.case_meetings ADD COLUMN client_note TEXT;
    END IF;
END $$;

-- 2. Infrastructure for iCal Tokens
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calendar_sync_token UUID DEFAULT gen_random_uuid();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"calendar_sync_enabled": false, "email_bridge_enabled": false}'::jsonb;

-- 3. Create a secure view for the iCal Generator
CREATE OR REPLACE VIEW public.calendar_export_data AS
SELECT 
    p.calendar_sync_token,
    p.id as user_id,
    cm.id as event_id,
    COALESCE(cm.case_id, cm.matter_id) as matter_id, -- Handle both naming conventions
    m.title as matter_title,
    COALESCE(cm.meeting_type, 'meeting') as event_type,
    cm.status,
    COALESCE(cm.confirmed_start, cm.proposed_start) as start_time,
    COALESCE(cm.confirmed_end, (COALESCE(cm.confirmed_start, cm.proposed_start) + interval '1 hour')) as end_time,
    'Legal Meeting: ' || m.title as title,
    'Client: ' || c.first_name || ' ' || c.last_name || COALESCE('\nNote: ' || cm.client_note, '') as description,
    cm.video_meeting_link as location
FROM public.profiles p
JOIN public.case_meetings cm ON cm.lawyer_user_id = p.id
JOIN public.matters m ON m.id = COALESCE(cm.case_id, cm.matter_id)
JOIN public.external_users c ON c.id = cm.client_id
WHERE p.calendar_sync_token IS NOT NULL
AND cm.status != 'rejected';

-- 4. Task Deadlines in Calendar
CREATE OR REPLACE VIEW public.task_calendar_export AS
SELECT 
    p.calendar_sync_token,
    p.id as user_id,
    mt.id as event_id,
    mt.matter_id,
    m.title as matter_title,
    'Task' as event_type,
    mt.status,
    mt.due_date as start_time,
    (mt.due_date + interval '30 minutes') as end_time,
    'DEADLINE: ' || mt.title as title,
    'Task Objective for Case: ' || m.title as description,
    '/internal/matter/' || mt.matter_id as location
FROM public.profiles p
JOIN public.matter_tasks mt ON mt.assigned_to_id = p.id
JOIN public.matters m ON m.id = mt.matter_id
WHERE p.calendar_sync_token IS NOT NULL
AND mt.due_date IS NOT NULL
AND mt.status != 'completed';

-- 5. Audit Log for Tool Syncing
INSERT INTO public.audit_logs (action, table_name, record_id, metadata)
VALUES ('calendar_sync_initialized', 'profiles', null, '{"info": "iCal Sync Infrastructure Deployed"}');

SELECT '✅ iCal Sync Infrastructure & Tokens Initialized' as status;

