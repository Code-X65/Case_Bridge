-- ==========================================
-- PHASE 17: CLIENT ANALYTICS OVERVIEW VIEW
-- ==========================================
-- This view aggregates client intelligence for the Internal Portal.

CREATE OR REPLACE VIEW public.client_analytics_overview AS
WITH client_matters AS (
    SELECT 
        client_id,
        firm_id,
        COUNT(*) FILTER (WHERE lifecycle_state IN ('in_progress', 'active', 'open', 'submitted')) as active_cases,
        COUNT(*) as total_cases
    FROM public.matters
    WHERE client_id IS NOT NULL
    GROUP BY client_id, firm_id
),
client_activity AS (
    SELECT 
        actor_id,
        firm_id,
        MAX(created_at) as last_activity_at
    FROM public.audit_logs
    GROUP BY actor_id, firm_id
),
pending_actions AS (
    -- Sum of pending signature requests and any other pending artifacts
    SELECT 
        client_id,
        firm_id,
        COUNT(*) as pending_count
    FROM public.signature_requests
    WHERE status = 'pending'
    GROUP BY client_id, firm_id
)
SELECT 
    eu.id as client_id,
    COALESCE(eu.first_name || ' ' || eu.last_name, 'Unknown Client') as client_name,
    eu.email,
    cm.firm_id,
    COALESCE(cm.active_cases, 0) as active_cases,
    COALESCE(cm.total_cases, 0) as total_cases,
    COALESCE(pa.pending_count, 0) as pending_client_actions,
    ca.last_activity_at,
    CASE 
        WHEN (COALESCE(pa.pending_count, 0) * 2 + 
              CASE 
                WHEN ca.last_activity_at IS NULL OR ca.last_activity_at < NOW() - INTERVAL '30 days' THEN 5
                WHEN ca.last_activity_at < NOW() - INTERVAL '14 days' THEN 3
                ELSE 0 
              END) >= 5 THEN 'High Risk'
        WHEN (COALESCE(pa.pending_count, 0) * 2 + 
              CASE 
                WHEN ca.last_activity_at IS NULL OR ca.last_activity_at < NOW() - INTERVAL '30 days' THEN 5
                WHEN ca.last_activity_at < NOW() - INTERVAL '14 days' THEN 3
                ELSE 0 
              END) >= 2 THEN 'Attention Needed'
        ELSE 'Healthy'
    END as risk_status
FROM public.external_users eu
JOIN client_matters cm ON eu.id = cm.client_id
LEFT JOIN client_activity ca ON (eu.id = ca.actor_id AND cm.firm_id = ca.firm_id)
LEFT JOIN pending_actions pa ON (eu.id = pa.client_id AND cm.firm_id = pa.firm_id);

-- RLS for the view (restricted to firm staff via check_access)
ALTER VIEW public.client_analytics_overview SET (security_invoker = on);

GRANT SELECT ON public.client_analytics_overview TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

SELECT '✅ Client Analytics Overview View created.' as status;

-- RPC for Peak Engagement Hour
CREATE OR REPLACE FUNCTION public.get_client_peak_hour(p_actor_id UUID)
RETURNS TABLE (peak_hour DOUBLE PRECISION) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXTRACT(HOUR FROM created_at) as peak_hour
    FROM public.audit_logs
    WHERE actor_id = p_actor_id
    GROUP BY peak_hour
    ORDER BY COUNT(*) DESC
    LIMIT 1;
$$;
