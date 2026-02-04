-- ==========================================
-- CALENDAR SYNC INFRASTRUCTURE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_calendar_connections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook')),
    provider_email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMPTZ,
    sync_enabled BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own calendar connections"
ON public.user_calendar_connections
FOR ALL
USING (auth.uid() = user_id);

-- Add a column to profiles to track preferred primary sync provider
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS primary_calendar_provider TEXT CHECK (primary_calendar_provider IN ('google', 'outlook', 'none')) DEFAULT 'none';

SELECT '✅ Calendar Sync Infrastructure created.' AS status;
