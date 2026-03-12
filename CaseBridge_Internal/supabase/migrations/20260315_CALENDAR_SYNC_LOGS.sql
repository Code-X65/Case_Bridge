-- ==========================================
-- Calendar Sync Logs Table (No pg_cron required)
-- ==========================================
-- This creates the sync logs table for tracking calendar sync operations
-- Note: pg_cron scheduling must be enabled in Supabase Dashboard manually

-- 1. Create sync logs table
CREATE TABLE IF NOT EXISTS public.calendar_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  connection_id UUID REFERENCES public.user_calendar_connections(id),
  provider TEXT,
  sync_type TEXT CHECK (sync_type IN ('full', 'push', 'pull')),
  status TEXT CHECK (status IN ('started', 'success', 'failed')),
  events_pushed INTEGER DEFAULT 0,
  events_pulled INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. Enable RLS
ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can view own sync logs"
  ON public.calendar_sync_logs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sync logs"
  ON public.calendar_sync_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- 4. Indexes
CREATE INDEX idx_calendar_sync_logs_user_id ON public.calendar_sync_logs(user_id);
CREATE INDEX idx_calendar_sync_logs_started_at ON public.calendar_sync_logs(started_at DESC);
CREATE INDEX idx_calendar_sync_logs_status ON public.calendar_sync_logs(status);

-- 5. Grant permissions
GRANT SELECT ON public.calendar_sync_logs TO authenticated;
GRANT INSERT ON public.calendar_sync_logs TO authenticated;
