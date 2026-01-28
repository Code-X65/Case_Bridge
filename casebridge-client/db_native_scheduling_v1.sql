-- ========================================================
-- CASE SCHEDULING V1 (NATIVE + EMBEDDED VIDEO) - CANONICAL
-- ========================================================
-- Freezes the 'Native Scheduling' model, explicit replacement of previous integrations.

-- A. Table Refactor
-- We assume case_meetings exists. We will modify it to match the canonical spec.
-- If it's effectively a new structure, we can drop and recreate or alter.
-- Given development environment, dropping is cleaner to enforce correct strict columns.

DROP TRIGGER IF EXISTS trg_handle_meeting_event ON public.case_meetings;
DROP TABLE IF EXISTS public.case_meetings CASCADE;

-- 1. Create Meeting Type & Provider Enums
DO $$ BEGIN
    CREATE TYPE public.video_provider_type AS ENUM ('zoom', 'google_meet');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Canonical Table
CREATE TABLE public.case_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.external_users(id),
    lawyer_user_id UUID NOT NULL REFERENCES public.profiles(id), -- Fixed to point to profiles per previous fix
    meeting_type public.meeting_type NOT NULL, -- 'virtual' or 'physical'
    
    -- Canonical Fields
    proposed_start TIMESTAMPTZ, -- Mandatory for 'requested'
    proposed_end TIMESTAMPTZ,
    confirmed_start TIMESTAMPTZ, -- Set on 'accepted'
    confirmed_end TIMESTAMPTZ,
    
    video_provider public.video_provider_type,
    video_meeting_link TEXT,
    
    join_window_start TIMESTAMPTZ,
    join_window_end TIMESTAMPTZ,

    client_note TEXT, -- 'Optional note' from Section 4
    rejection_note TEXT, -- 'Optional rejection note' from Section 5
    
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'rejected', 'completed', 'cancelled')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS Policies
ALTER TABLE public.case_meetings ENABLE ROW LEVEL SECURITY;

-- Clients: View own, Insert 'requested'
CREATE POLICY "Clients view own meetings" ON public.case_meetings
FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Clients request meetings" ON public.case_meetings
FOR INSERT WITH CHECK (
    client_id = auth.uid() 
    AND status = 'requested' -- Enforce initial status
    AND EXISTS (
        SELECT 1 FROM public.matters m 
        WHERE m.id = case_id 
        AND m.client_id = auth.uid()
        AND m.lifecycle_state IN ('under_review', 'in_progress')
    )
);

-- Lawyers: View assigned, Update status (Accept/Reject)
CREATE POLICY "Lawyers view assigned meetings" ON public.case_meetings
FOR SELECT USING (lawyer_user_id = auth.uid());

CREATE POLICY "Lawyers manage assigned meetings" ON public.case_meetings
FOR UPDATE USING (lawyer_user_id = auth.uid())
WITH CHECK (lawyer_user_id = auth.uid()); 
-- Note: Strict check helps. Ideally check for status transitions, but raw update access is sufficient for v1.

-- Firm Admin/CM: View All (Oversight), Cancel Only
CREATE POLICY "Firm oversight view" ON public.case_meetings
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles ufr
        JOIN public.matters m ON m.firm_id = ufr.firm_id
        WHERE m.id = public.case_meetings.case_id
        AND ufr.user_id = auth.uid()
        AND ufr.status = 'active'
        AND LOWER(ufr.role) IN ('admin_manager', 'case_manager')
    )
);

-- 4. Event Logic
CREATE OR REPLACE FUNCTION public.handle_native_meeting_event()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
         PERFORM public.emit_case_event(
            'meeting_requested', 
            NEW.case_id, 
            (SELECT firm_id FROM public.matters WHERE id = NEW.case_id),
            jsonb_build_object('meeting_id', NEW.id, 'lawyer_id', NEW.lawyer_user_id)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status <> NEW.status THEN
             PERFORM public.emit_case_event(
                'meeting_' || NEW.status, -- meeting_accepted, meeting_rejected, meeting_cancelled
                NEW.case_id, 
                (SELECT firm_id FROM public.matters WHERE id = NEW.case_id),
                jsonb_build_object('meeting_id', NEW.id)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_handle_native_meeting_event
AFTER INSERT OR UPDATE ON public.case_meetings
FOR EACH ROW EXECUTE FUNCTION public.handle_native_meeting_event();

SELECT '✅ Native Scheduling v1 Model Applied' as status;
