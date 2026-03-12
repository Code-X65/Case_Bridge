-- ==========================================
-- UNIFIED CALENDAR & RESOURCE SCHEDULING
-- ==========================================

-- 1. PHYSICAL LOCATIONS (Firm Rooms)
CREATE TABLE IF NOT EXISTS public.firm_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    capacity INTEGER,
    features JSONB DEFAULT '[]'::jsonb, -- e.g., ["projector", "video_conf"]
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. UNIFIED CALENDAR EVENTS
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('meeting', 'court_hearing', 'deadline', 'discovery', 'mediation', 'other')),
    meeting_type TEXT NOT NULL DEFAULT 'virtual' CHECK (meeting_type IN ('virtual', 'physical', 'hybrid')),
    
    -- Schedule
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Virtual Metadata
    virtual_provider TEXT DEFAULT 'internal',
    virtual_link TEXT,
    
    -- Physical Metadata
    location_id UUID REFERENCES public.firm_locations(id) ON DELETE SET NULL,
    offsite_address TEXT,
    
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('proposed', 'confirmed', 'cancelled', 'completed')),
    priority TEXT DEFAULT 'standard' CHECK (priority IN ('standard', 'urgent', 'critical')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT event_time_check CHECK (end_time > start_time)
);

-- 3. EVENT PARTICIPANTS
CREATE TABLE IF NOT EXISTS public.calendar_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    role TEXT DEFAULT 'attendee' CHECK (role IN ('organizer', 'attendee', 'optional')),
    attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'accepted', 'declined', 'tentative')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- 4. STAFF AVAILABILITY (OOO/Busy)
CREATE TABLE IF NOT EXISTS public.staff_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    is_blocking BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.firm_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;

-- Firm-level isolation for everything
CREATE POLICY "firm_isolation_locations" ON public.firm_locations FOR ALL USING (
    firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "firm_isolation_events" ON public.calendar_events FOR ALL USING (
    firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
);

CREATE POLICY "firm_isolation_participants" ON public.calendar_participants FOR ALL USING (
    event_id IN (SELECT id FROM public.calendar_events)
);

CREATE POLICY "firm_isolation_availability" ON public.staff_availability FOR ALL USING (
    firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
);

-- ==========================================
-- CONFLICT DETECTION TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION public.fn_check_calendar_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Check Room Conflict (if physical/hybrid)
    IF NEW.location_id IS NOT NULL AND NEW.status = 'confirmed' THEN
        IF EXISTS (
            SELECT 1 FROM public.calendar_events
            WHERE location_id = NEW.location_id
            AND id != NEW.id
            AND status = 'confirmed'
            AND (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time)
        ) THEN
            RAISE EXCEPTION 'Room is already booked for this time period.';
        END IF;
    END IF;

    -- 2. Check Staff Blocking Availability
    IF EXISTS (
        SELECT 1 FROM public.staff_availability
        WHERE user_id = NEW.created_by
        AND is_blocking = TRUE
        AND (start_time, end_time) OVERLAPS (NEW.start_time, NEW.end_time)
    ) THEN
        RAISE NOTICE 'Note: Creator has blocking availability set for this time.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_calendar_conflicts
BEFORE INSERT OR UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.fn_check_calendar_conflicts();

-- ==========================================
-- REALTIME
-- ==========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_participants;

SELECT '✅ Unified Scheduling Schema Applied.' AS status;
