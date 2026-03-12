-- ==========================================
-- CALENDAR INTEGRATION ENHANCEMENT
-- Phase 1: Database Schema Enhancements
-- ==========================================

-- 1. Add enhanced columns to user_calendar_connections for calendar selection and sync direction
ALTER TABLE public.user_calendar_connections
ADD COLUMN IF NOT EXISTS calendar_id TEXT,
ADD COLUMN IF NOT EXISTS calendar_name TEXT,
ADD COLUMN IF NOT EXISTS sync_direction TEXT DEFAULT 'outbound' CHECK (sync_direction IN ('outbound', 'inbound', 'both')),
ADD COLUMN IF NOT EXISTS webhook_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS sync_settings JSONB DEFAULT '{"auto_sync": true, "sync_tasks": true, "sync_deadlines": true}'::jsonb;

-- 2. Create calendar_event_mappings table to track mapped events
CREATE TABLE IF NOT EXISTS public.calendar_event_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    casebridge_event_id UUID NOT NULL,
    external_event_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'task', 'deadline')),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
    sync_error_message TEXT,
    external_event_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(casebridge_event_id, provider, user_id)
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_user ON public.calendar_event_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_provider ON public.calendar_event_mappings(provider);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_status ON public.calendar_event_mappings(sync_status);
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_casebridge ON public.calendar_event_mappings(casebridge_event_id);

-- 4. Enable RLS
ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users manage own event mappings" ON public.calendar_event_mappings;
CREATE POLICY "Users manage own event mappings"
ON public.calendar_event_mappings
FOR ALL
USING (auth.uid() = user_id);

-- 6. Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_calendar_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_calendar_mapping_updated_at ON public.calendar_event_mappings;
CREATE TRIGGER set_calendar_mapping_updated_at
    BEFORE UPDATE ON public.calendar_event_mappings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_calendar_mapping_updated_at();

-- 7. Create function to get sync status for a user
CREATE OR REPLACE FUNCTION public.get_calendar_sync_status(p_user_id UUID)
RETURNS TABLE (
    provider TEXT,
    last_sync TIMESTAMPTZ,
    events_synced BIGINT,
    pending_sync BIGINT,
    errors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ucc.provider,
        ucc.last_sync_at,
        COUNT(CASE WHEN cem.sync_status = 'synced' THEN 1 END)::BIGINT AS events_synced,
        COUNT(CASE WHEN cem.sync_status = 'pending' THEN 1 END)::BIGINT AS pending_sync,
        COUNT(CASE WHEN cem.sync_status IN ('error', 'conflict') THEN 1 END)::BIGINT AS errors
    FROM public.user_calendar_connections ucc
    LEFT JOIN public.calendar_event_mappings cem ON cem.user_id = ucc.user_id AND cem.provider = ucc.provider
    WHERE ucc.user_id = p_user_id AND ucc.sync_enabled = true
    GROUP BY ucc.provider, ucc.last_sync_at;
END;
$$ LANGUAGE plpgsql;

-- 8. Add function to handle sync direction changes
CREATE OR REPLACE FUNCTION public.update_calendar_sync_direction(
    p_connection_id UUID,
    p_direction TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE public.user_calendar_connections
    SET sync_direction = p_direction
    WHERE id = p_connection_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Add function to queue events for sync
CREATE OR REPLACE FUNCTION public.queue_calendar_event_sync(
    p_casebridge_event_id UUID,
    p_provider TEXT,
    p_user_id UUID,
    p_event_type TEXT DEFAULT 'meeting'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.calendar_event_mappings (
        casebridge_event_id,
        provider,
        user_id,
        event_type,
        sync_status
    )
    VALUES (
        p_casebridge_event_id,
        p_provider,
        p_user_id,
        p_event_type,
        'pending'
    )
    ON CONFLICT (casebridge_event_id, provider, user_id) 
    DO UPDATE SET sync_status = 'pending', updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Calendar Integration Database Schema Enhanced' AS status;
