-- ========================================================
-- CASE SCHEDULING V1 (AUTHORITATIVE)
-- ========================================================

-- 1. Lawyer Setup: Add calendly_url to profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='calendly_url') THEN
        ALTER TABLE public.profiles ADD COLUMN calendly_url TEXT;
    END IF;
END $$;

-- 2. Create Meeting Types Enum
DO $$ BEGIN
    CREATE TYPE public.meeting_type AS ENUM ('virtual', 'physical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Case Meetings Table (System of Record)
CREATE TABLE IF NOT EXISTS public.case_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.external_users(id),
    lawyer_user_id UUID NOT NULL REFERENCES auth.users(id),
    meeting_type public.meeting_type NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    calendly_event_id TEXT UNIQUE,
    location_or_link TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.case_meetings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Security & Access Rules)
-- Clients may access only meetings tied to their cases
DROP POLICY IF EXISTS "Clients view own meetings" ON public.case_meetings;
CREATE POLICY "Clients view own meetings"
ON public.case_meetings FOR SELECT
USING (client_id = auth.uid());

-- Lawyers may access only meetings tied to assigned cases
DROP POLICY IF EXISTS "Lawyers view own assignments" ON public.case_meetings;
CREATE POLICY "Lawyers view own assignments"
ON public.case_meetings FOR SELECT
USING (lawyer_user_id = auth.uid());

-- Admins / Case Managers may view all meetings for firm matters
DROP POLICY IF EXISTS "Firm management view meetings" ON public.case_meetings;
CREATE POLICY "Firm management view meetings"
ON public.case_meetings FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        JOIN public.matters m ON m.firm_id = ufr.firm_id
        WHERE m.id = public.case_meetings.case_id
        AND ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
    )
);

-- Insertion: Clients can insert through their portal
DROP POLICY IF EXISTS "Clients can schedule meetings" ON public.case_meetings;
CREATE POLICY "Clients can schedule meetings"
ON public.case_meetings FOR INSERT
WITH CHECK (
    client_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = case_id
        AND m.client_id = auth.uid()
        AND m.lifecycle_state IN ('under_review', 'in_progress')
    )
);

-- Management can update status (cancel/reschedule)
DROP POLICY IF EXISTS "Management can manage meetings" ON public.case_meetings;
CREATE POLICY "Management can manage meetings"
ON public.case_meetings FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        JOIN public.matters m ON m.firm_id = ufr.firm_id
        WHERE m.id = public.case_meetings.case_id
        AND ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
    )
    OR lawyer_user_id = auth.uid()
);

-- 6. Event Handling (Section 8)
-- Function to emit informational scheduling events
CREATE OR REPLACE FUNCTION public.handle_meeting_event()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
         PERFORM public.emit_case_event(
            'meeting_scheduled', 
            NEW.case_id, 
            (SELECT firm_id FROM public.matters WHERE id = NEW.case_id),
            jsonb_build_object('meeting_id', NEW.id, 'lawyer_id', NEW.lawyer_user_id)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status <> NEW.status AND NEW.status = 'cancelled' THEN
            PERFORM public.emit_case_event(
                'meeting_cancelled', 
                NEW.case_id, 
                (SELECT firm_id FROM public.matters WHERE id = NEW.case_id),
                jsonb_build_object('meeting_id', NEW.id)
            );
        ELSIF OLD.scheduled_start <> NEW.scheduled_start THEN
            PERFORM public.emit_case_event(
                'meeting_rescheduled', 
                NEW.case_id, 
                (SELECT firm_id FROM public.matters WHERE id = NEW.case_id),
                jsonb_build_object('meeting_id', NEW.id, 'old_start', OLD.scheduled_start, 'new_start', NEW.scheduled_start)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_handle_meeting_event ON public.case_meetings;
CREATE TRIGGER trg_handle_meeting_event
AFTER INSERT OR UPDATE ON public.case_meetings
FOR EACH ROW EXECUTE FUNCTION public.handle_meeting_event();

SELECT '✅ Case Scheduling v1 Data Model Applied' AS status;
