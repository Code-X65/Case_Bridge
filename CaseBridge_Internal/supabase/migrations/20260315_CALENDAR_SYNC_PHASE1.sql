-- ==========================================
-- CALENDAR SYNC PHASE 1 - Database Schema Enhancements
-- Date: 2026-03-15
-- Purpose: Enable two-way calendar sync with external providers
-- ==========================================

-- ============================================================================
-- 1. ADD COLUMNS TO user_calendar_connections TABLE
-- ============================================================================

-- Add calendar_id column - external calendar ID from Google/Outlook
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_calendar_connections' 
        AND column_name = 'calendar_id'
    ) THEN
        ALTER TABLE public.user_calendar_connections 
        ADD COLUMN calendar_id TEXT;
    END IF;
END $$;

-- Add calendar_name column - friendly calendar name for UI display
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_calendar_connections' 
        AND column_name = 'calendar_name'
    ) THEN
        ALTER TABLE public.user_calendar_connections 
        ADD COLUMN calendar_name TEXT;
    END IF;
END $$;

-- Add sync_direction column - controls sync flow direction
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_calendar_connections' 
        AND column_name = 'sync_direction'
    ) THEN
        ALTER TABLE public.user_calendar_connections 
        ADD COLUMN sync_direction TEXT DEFAULT 'outbound' 
        CHECK (sync_direction IN ('outbound', 'inbound', 'both'));
    END IF;
END $$;

-- Add webhook_subscription_id column - for tracking webhook subscriptions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_calendar_connections' 
        AND column_name = 'webhook_subscription_id'
    ) THEN
        ALTER TABLE public.user_calendar_connections 
        ADD COLUMN webhook_subscription_id TEXT;
    END IF;
END $$;

-- Add webhook_secret column - for webhook verification
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_calendar_connections' 
        AND column_name = 'webhook_secret'
    ) THEN
        ALTER TABLE public.user_calendar_connections 
        ADD COLUMN webhook_secret TEXT;
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE calendar_event_mappings TABLE
-- Purpose: Track mapped events between CaseBridge and external calendars
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.calendar_event_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    casebridge_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
    external_event_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(casebridge_event_id, provider, user_id)
);

-- ============================================================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index on casebridge_event_id for quick lookups when syncing updates
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_casebridge_event_id 
ON public.calendar_event_mappings(casebridge_event_id);

-- Composite index on user_id and provider for efficient queries
CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_user_provider 
ON public.calendar_event_mappings(user_id, provider);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.calendar_event_mappings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES FOR calendar_event_mappings
-- ============================================================================

-- Policy: Users can only manage their own event mappings
DROP POLICY IF EXISTS "Users manage own event mappings" ON public.calendar_event_mappings;
CREATE POLICY "Users manage own event mappings"
ON public.calendar_event_mappings
FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- 6. NOTIFY POSTGREST TO RELOAD SCHEMA
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 
    '✅ Calendar Sync Phase 1 Complete' AS status,
    'Added columns to user_calendar_connections, created calendar_event_mappings table, added indexes and RLS policies' AS details;
