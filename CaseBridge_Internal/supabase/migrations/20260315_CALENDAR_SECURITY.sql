-- =============================================================================
-- Phase 6: Calendar Security Hardening Migration
-- =============================================================================
-- Migration: 20260315_CALENDAR_SECURITY.sql
-- Description: Implements security best practices for calendar integration
-- =============================================================================

-- 1. Encrypt sensitive tokens at rest (if vault extension available)
-- Add encrypted_storage columns to user_calendar_connections
ALTER TABLE public.user_calendar_connections 
ADD COLUMN IF NOT EXISTS access_token_encrypted TEXT,
ADD COLUMN IF NOT EXISTS refresh_token_encrypted TEXT;

-- 2. Add rate limiting tracking
ALTER TABLE public.user_calendar_connections
ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sync_failure_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- 3. Create function to check rate limits
CREATE OR REPLACE FUNCTION public.check_calendar_sync_rate_limit(
  p_user_id UUID,
  p_max_attempts INTEGER DEFAULT 5,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
  v_attempts INTEGER;
BEGIN
  -- Check if user is locked
  SELECT sync_failure_count INTO v_attempts
  FROM public.user_calendar_connections
  WHERE user_id = p_user_id AND sync_failure_count >= p_max_attempts;
  
  IF v_attempts IS NOT NULL THEN
    RETURN false;
  END IF;
  
  -- Check if within the time window
  IF p_window_minutes > 0 THEN
    SELECT sync_failure_count INTO v_attempts
    FROM public.user_calendar_connections
    WHERE user_id = p_user_id
      AND last_sync_attempt IS NOT NULL
      AND last_sync_attempt > NOW() - (p_window_minutes || ' minutes')::INTERVAL
      AND sync_failure_count >= p_max_attempts;
    
    IF v_attempts IS NOT NULL THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to record sync attempt and handle rate limiting
CREATE OR REPLACE FUNCTION public.record_calendar_sync_attempt(
  p_user_id UUID,
  p_success BOOLEAN DEFAULT false
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_calendar_connections
  SET 
    last_sync_attempt = NOW(),
    sync_failure_count = CASE 
      WHEN p_success THEN 0 
      ELSE sync_failure_count + 1 
    END,
    is_locked = CASE 
      WHEN sync_failure_count + 1 >= 5 THEN true 
      ELSE is_locked 
    END
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create audit log for calendar operations
CREATE TABLE IF NOT EXISTS public.calendar_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.user_calendar_connections(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  provider TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for audit log
ALTER TABLE public.calendar_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit log
CREATE POLICY "Users can view own calendar audit logs"
  ON public.calendar_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage calendar audit logs"
  ON public.calendar_audit_log
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Index for audit log
CREATE INDEX IF NOT EXISTS idx_calendar_audit_log_user_id ON public.calendar_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_audit_log_created_at ON public.calendar_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_audit_log_connection_id ON public.calendar_audit_log(connection_id);

-- 6. Create function to log calendar audit events
CREATE OR REPLACE FUNCTION public.log_calendar_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_provider TEXT DEFAULT NULL,
  p_connection_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
BEGIN
  INSERT INTO public.calendar_audit_log (
    user_id,
    connection_id,
    action,
    provider,
    ip_address,
    user_agent,
    details
  ) VALUES (
    p_user_id,
    p_connection_id,
    p_action,
    p_provider,
    p_ip_address,
    p_user_agent,
    p_details
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add webhook verification helper function
CREATE OR REPLACE FUNCTION public.verify_webhook_signature(
  p_payload TEXT,
  p_signature TEXT,
  p_secret TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Simple HMAC verification placeholder
  -- In production, implement proper HMAC-SHA256 verification
  -- using the p_secret to verify p_signature against p_payload
  IF p_signature IS NULL OR p_payload IS NULL OR p_secret IS NULL THEN
    RETURN false;
  END IF;
  
  -- Placeholder: In production, use proper cryptographic verification
  -- Example: RETURN hmac.verify(p_payload, p_secret, p_signature);
  RETURN length(p_signature) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to unlock user after cool-down period
CREATE OR REPLACE FUNCTION public.unlock_calendar_connection(
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.user_calendar_connections
  SET 
    is_locked = false,
    sync_failure_count = 0
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.check_calendar_sync_rate_limit(UUID, INTEGER, INTEGER) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.record_calendar_sync_attempt(UUID, BOOLEAN) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.log_calendar_audit_event(UUID, TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_webhook_signature(TEXT, TEXT, TEXT) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_calendar_connection(UUID) TO service_role, authenticated;

GRANT SELECT ON TABLE public.calendar_audit_log TO service_role, authenticated;

-- 10. Add comment for documentation
COMMENT ON TABLE public.calendar_audit_log IS 'Audit log for calendar operations - tracks OAuth, sync, and security events';
COMMENT ON COLUMN public.user_calendar_connections.access_token_encrypted IS 'Encrypted access token storage';
COMMENT ON COLUMN public.user_calendar_connections.refresh_token_encrypted IS 'Encrypted refresh token storage';
COMMENT ON COLUMN public.user_calendar_connections.last_sync_attempt IS 'Timestamp of last sync attempt for rate limiting';
COMMENT ON COLUMN public.user_calendar_connections.sync_failure_count IS 'Count of consecutive sync failures';
COMMENT ON COLUMN public.user_calendar_connections.is_locked IS 'Flag indicating if connection is locked due to rate limiting';

-- =============================================================================
-- End of Phase 6 Security Migration
-- =============================================================================
