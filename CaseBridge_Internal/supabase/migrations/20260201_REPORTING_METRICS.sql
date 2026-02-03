-- ==========================================
-- SLA & REPORTING METRICS (CANONICAL)
-- ==========================================

-- 1. Pre-flight Fix: Ensure matter_status enum has the expected values for the analytics engine
DO $$ 
BEGIN
    BEGIN
        ALTER TYPE public.matter_status ADD VALUE 'active';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER TYPE public.matter_status ADD VALUE 'on_hold';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;

-- 2. Helper Function: Get first time an event occurred for a target
CREATE OR REPLACE FUNCTION public.get_first_audit_timestamp(p_target_id UUID, p_action TEXT)
RETURNS TIMESTAMPTZ AS $$
    SELECT created_at 
    FROM public.audit_logs 
    WHERE target_id = p_target_id 
    AND action = p_action 
    ORDER BY created_at ASC 
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. View: Matter Lifecycle Timelines
-- Tracks the critical milestones for every matter
CREATE OR REPLACE VIEW public.matter_timelines AS
SELECT 
    m.id AS matter_id,
    m.firm_id,
    m.title,
    m.status::TEXT AS current_status,
    m.created_at,
    -- Time until first associate was assigned
    public.get_first_audit_timestamp(m.id, 'associate_assigned') AS assigned_at,
    -- Time until the case was closed (handling both 'closed' and 'archived')
    (SELECT created_at FROM public.audit_logs 
     WHERE target_id = m.id 
     AND action = 'matter_status_changed' 
     AND (metadata->>'new_status') IN ('closed', 'archived')
     ORDER BY created_at ASC LIMIT 1) AS closed_at,
    -- Calculation: Response Time (Creation to Assignment)
    EXTRACT(EPOCH FROM (public.get_first_audit_timestamp(m.id, 'associate_assigned') - m.created_at))/3600 AS response_hours,
    -- Calculation: Resolution Time (Creation to Close)
    EXTRACT(EPOCH FROM ((SELECT created_at FROM public.audit_logs 
                         WHERE target_id = m.id 
                         AND action = 'matter_status_changed' 
                         AND (metadata->>'new_status') IN ('closed', 'archived')
                         ORDER BY created_at ASC LIMIT 1) - m.created_at))/86400 AS resolution_days
FROM public.matters m;

-- 4. View: Staff Performance Metrics
-- Aggregate stats for each internal user
CREATE OR REPLACE VIEW public.staff_performance_report AS
SELECT 
    p.id AS staff_id,
    p.full_name,
    ufr.firm_id,
    ufr.role,
    (SELECT COUNT(*) FROM public.matters 
     WHERE assigned_associate = p.id 
     AND status::TEXT IN ('active', 'open', 'in_progress')) AS active_matters,
    (SELECT COUNT(*) FROM public.matters 
     WHERE assigned_associate = p.id 
     AND status::TEXT IN ('closed', 'archived')) AS closed_matters,
    (SELECT AVG(resolution_days) FROM public.matter_timelines mt 
     JOIN public.matters m ON mt.matter_id = m.id 
     WHERE m.assigned_associate = p.id AND mt.closed_at IS NOT NULL) AS avg_resolution_days
FROM public.profiles p
JOIN public.user_firm_roles ufr ON p.id = ufr.user_id
WHERE ufr.status = 'active';

-- 5. RPC: Get Firm-Wide Overview Stats
-- Used for the high-level dashboard metrics
CREATE OR REPLACE FUNCTION public.get_firm_reporting_stats(p_firm_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_matters', (SELECT COUNT(*) FROM public.matters WHERE firm_id = p_firm_id),
        'active_matters', (SELECT COUNT(*) FROM public.matters WHERE firm_id = p_firm_id AND status::TEXT IN ('active', 'open', 'in_progress')),
        'pending_review', (SELECT COUNT(*) FROM public.matters WHERE firm_id = p_firm_id AND status::TEXT IN ('pending', 'pending_review', 'under_review')),
        'avg_response_hours', (SELECT COALESCE(AVG(response_hours), 0) FROM public.matter_timelines WHERE firm_id = p_firm_id AND assigned_at IS NOT NULL),
        'avg_resolution_days', (SELECT COALESCE(AVG(resolution_days), 0) FROM public.matter_timelines WHERE firm_id = p_firm_id AND closed_at IS NOT NULL),
        'closing_rate', (
            SELECT CASE 
                WHEN COUNT(*) = 0 THEN 0 
                ELSE (SELECT COUNT(*) FROM public.matters WHERE firm_id = p_firm_id AND status::TEXT IN ('closed', 'archived'))::FLOAT / COUNT(*)::FLOAT 
            END 
            FROM public.matters WHERE firm_id = p_firm_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS for Reporting Views
ALTER VIEW public.matter_timelines SET (security_invoker = on);
ALTER VIEW public.staff_performance_report SET (security_invoker = on);

SELECT '✅ SLA & Reporting Metrics System Initialized (v2 with Robust Enum Handling).' as status;
