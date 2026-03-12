-- ==========================================
-- CALENDAR SYNC PHASE 5 - Cron Job / Scheduled Sync Setup
-- Date: 2026-03-15
-- Purpose: Enable scheduled calendar synchronization using pg_cron
-- ==========================================

-- ============================================================================
-- 1. ENABLE PG_CRON EXTENSION
-- ============================================================================

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant necessary permissions for cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL ON SCHEMA cron TO postgres;

-- Enable necessary extensions for HTTP calls
CREATE EXTENSION IF NOT EXISTS http;

-- ============================================================================
-- 2. CREATE FUNCTION TO INVOKE CALENDAR-SYNC EDGE FUNCTION
-- ============================================================================

-- Drop existing function if exists (for idempotency)
DROP FUNCTION IF EXISTS cron.calendar_sync_job();

-- Create function to call the calendar-sync edge function
-- This function will be called by pg_cron on schedule
CREATE OR REPLACE FUNCTION cron.calendar_sync_job()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT;
  service_role_key TEXT;
  sync_log_id UUID;
  connection_record RECORD;
  connections_count INTEGER := 0;
  success_count INTEGER := 0;
  failed_count INTEGER := 0;
BEGIN
  -- Get Supabase credentials from environment
  supabase_url := COALESCE(
    current_setting('app.settings.SUPABASE_URL', true),
    (SELECT value FROM vault.secrets WHERE key = 'SUPABASE_URL')
  );
  
  service_role_key := COALESCE(
    current_setting('app.settings.SUPABASE_SERVICE_ROLE_KEY', true),
    (SELECT value FROM vault.secrets WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
  );

  -- If we can't get credentials from settings, try environment variable alternative
  IF supabase_url IS NULL OR supabase_url = '' THEN
    supabase_url := current_setting('app.settings.EXTERNAL_SUPABASE_URL', true);
  END IF;
  
  IF service_role_key IS NULL OR service_role_key = '' THEN
    service_role_key := current_setting('app.settings.EXTERNAL_SERVICE_ROLE_KEY', true);
  END IF;

  -- Log job start
  INSERT INTO public.calendar_sync_logs (
    user_id,
    connection_id,
    provider,
    sync_type,
    status,
    started_at
  ) VALUES (
    NULL,  -- System-initiated sync has no specific user
    NULL,
    'system',
    'full',
    'started',
    NOW()
  ) RETURNING id INTO sync_log_id;

  -- Call the edge function via HTTP
  -- Note: We use a simpler approach that doesn't require vault secrets
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/calendar-sync',
      body := '{"scheduled": true}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )
    );
    
    -- Update log as successful
    UPDATE public.calendar_sync_logs
    SET status = 'success',
        completed_at = NOW(),
        events_pulled = connections_count,
        events_pushed = success_count
    WHERE id = sync_log_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the cron job
    RAISE WARNING 'Calendar sync job failed: %', SQLERRM;
    
    UPDATE public.calendar_sync_logs
    SET status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM
    WHERE id = sync_log_id;
  END;
END;
$$;

-- ============================================================================
-- 3. CREATE SYNC STATUS LOGGING TABLE
-- ============================================================================

-- Create table to log sync operations for debugging and monitoring
CREATE TABLE IF NOT EXISTS public.calendar_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  connection_id UUID REFERENCES public.user_calendar_connections(id) ON DELETE SET NULL,
  provider TEXT CHECK (provider IN ('google', 'outlook', 'system')),
  sync_type TEXT CHECK (sync_type IN ('full', 'push', 'pull')) DEFAULT 'full',
  status TEXT CHECK (status IN ('started', 'success', 'failed')) NOT NULL,
  events_pushed INTEGER DEFAULT 0,
  events_pulled INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS POLICIES FOR calendar_sync_logs
-- ============================================================================

-- Policy: Users can view their own sync logs
DROP POLICY IF EXISTS "Users can view own sync logs" ON public.calendar_sync_logs;
CREATE POLICY "Users can view own sync logs"
  ON public.calendar_sync_logs
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.jwt()->>'role' IN ('service_role', 'authenticated')
  );

-- Policy: Users can insert their own sync logs (for manual sync from frontend)
DROP POLICY IF EXISTS "Users can insert own sync logs" ON public.calendar_sync_logs;
CREATE POLICY "Users can insert own sync logs"
  ON public.calendar_sync_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR auth.jwt()->>'role' = 'service_role'
  );

-- Policy: Service role can manage all sync logs
DROP POLICY IF EXISTS "Service role can manage sync logs" ON public.calendar_sync_logs;
CREATE POLICY "Service role can manage sync logs"
  ON public.calendar_sync_logs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- 5. CREATE INDEXES FOR EFFICIENT QUERIES
-- ============================================================================

-- Index on user_id for user-specific sync history
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_user_id 
  ON public.calendar_sync_logs(user_id);

-- Index on started_at for time-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_started_at 
  ON public.calendar_sync_logs(started_at DESC);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_status 
  ON public.calendar_sync_logs(status);

-- Index on connection_id for connection-specific logs
CREATE INDEX IF NOT EXISTS idx_calendar_sync_logs_connection_id 
  ON public.calendar_sync_logs(connection_id);

-- ============================================================================
-- 6. SCHEDULE THE CALENDAR SYNC JOB (HOURLY)
-- ============================================================================

-- Unschedule existing job if running different schedule
SELECT cron.unschedule('calendar-sync-job');

-- Schedule the job to run every hour at minute 0
-- Cron expression: '0 * * * *' = minute 0 of every hour, every day
SELECT cron.schedule(
  'calendar-sync-job',
  '0 * * * *',
  'cron.calendar_sync_job()'
);

-- ============================================================================
-- 7. ADDITIONAL HELPER FUNCTION FOR MANUAL SYNC
-- ============================================================================

-- Create function to trigger manual sync for a specific user
-- This can be called from the frontend when user clicks "Sync Now"
CREATE OR REPLACE FUNCTION public.trigger_calendar_sync_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sync_log_id UUID;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  -- Get Supabase credentials
  supabase_url := current_setting('app.settings.EXTERNAL_SUPABASE_URL', true);
  service_role_key := current_setting('app.settings.EXTERNAL_SERVICE_ROLE_KEY', true);

  -- Create sync log entry
  INSERT INTO public.calendar_sync_logs (
    user_id,
    provider,
    sync_type,
    status,
    started_at
  ) VALUES (
    p_user_id,
    'user',
    'full',
    'started',
    NOW()
  )
  RETURNING id INTO sync_log_id;

  -- Call the edge function for this specific user
  BEGIN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/calendar-sync',
      body := jsonb_build_object(
        'user_id', p_user_id,
        'manual', true
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || service_role_key
      )
    );

    -- Update log as successful
    UPDATE public.calendar_sync_logs
    SET status = 'success',
        completed_at = NOW()
    WHERE id = sync_log_id;

  EXCEPTION WHEN OTHERS THEN
    -- Update log as failed
    UPDATE public.calendar_sync_logs
    SET status = 'failed',
        completed_at = NOW(),
        error_message = SQLERRM
    WHERE id = sync_log_id;
  END;

  RETURN sync_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.trigger_calendar_sync_for_user(UUID) TO authenticated;

-- ============================================================================
-- 8. NOTIFY POSTGREST TO RELOAD SCHEMA
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 
  '✅ Calendar Sync Phase 5 Complete' AS status,
  'Enabled pg_cron, created calendar_sync_job function, scheduled hourly sync, created calendar_sync_logs table with RLS and indexes, created manual sync trigger function' AS details;
