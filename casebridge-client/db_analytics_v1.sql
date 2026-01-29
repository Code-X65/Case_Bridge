-- ========================================================
-- CASE MANAGER ANALYTICS & CLIENT BEHAVIOUR v1 (CANONICAL)
-- ========================================================

-- 1. ACTIVITY TRACKING PROCEDURE
-- Used by frontend to log views/interactions not captured by DB triggers
-- (e.g., document_viewed via signed URL opening)
CREATE OR REPLACE FUNCTION public.track_client_activity(
    p_action TEXT,
    p_target_id UUID,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
    v_firm_id UUID;
BEGIN
    -- Try to resolve firm_id from matter_id in metadata if present
    IF (p_metadata->>'matter_id') IS NOT NULL THEN
        SELECT firm_id INTO v_firm_id FROM public.matters WHERE id = (p_metadata->>'matter_id')::UUID;
    END IF;

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        target_id,
        metadata,
        firm_id
    )
    VALUES (
        auth.uid(),
        p_action,
        p_target_id,
        p_metadata,
        v_firm_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. CLIENT ANALYTICS OVERVIEW VIEW
-- Aggregates key metrics for the main table.
-- SECURITY: Defined with security_invoker to respect RLS on underlying tables.
-- ACCESS: Explicitly filtered to allow only Case Managers and Admins.
DROP VIEW IF EXISTS public.client_analytics_overview;
CREATE VIEW public.client_analytics_overview WITH (security_invoker = true) AS
WITH client_stats AS (
    SELECT
        m.client_id,
        m.firm_id,
        COUNT(m.id) as total_cases,
        COUNT(m.id) FILTER (WHERE m.lifecycle_state IN ('under_review', 'in_progress')) as active_cases,
        MAX(m.updated_at) as last_case_update
    FROM public.matters m
    GROUP BY m.client_id, m.firm_id
),
last_interactions AS (
    SELECT
        m.client_id,
        MAX(cm.created_at) as last_msg_at
    FROM public.matters m
    JOIN public.case_messages cm ON cm.matter_id = m.id
    WHERE cm.sender_role = 'client'
    GROUP BY m.client_id
),
pending_actions AS (
    -- Count of unread messages from staff (approximation: messages from staff created after last client message)
    SELECT
        m.client_id,
        COUNT(cm.id) as pending_count
    FROM public.matters m
    JOIN public.case_messages cm ON cm.matter_id = m.id
    LEFT JOIN last_interactions li ON li.client_id = m.client_id
    WHERE cm.sender_role != 'client'
    AND (li.last_msg_at IS NULL OR cm.created_at > li.last_msg_at)
    GROUP BY m.client_id
)
SELECT
    eu.id as client_id,
    cs.firm_id,
    eu.first_name || ' ' || eu.last_name as client_name,
    eu.email,
    COALESCE(cs.total_cases, 0) as total_cases,
    COALESCE(cs.active_cases, 0) as active_cases,
    COALESCE(pa.pending_count, 0) as pending_client_actions,
    GREATEST(cs.last_case_update, li.last_msg_at) as last_activity_at,
    -- Risk Calculation (Static Rules v1)
    CASE
        WHEN cs.active_cases > 0 AND (li.last_msg_at < NOW() - INTERVAL '14 days' OR (li.last_msg_at IS NULL AND cs.last_case_update < NOW() - INTERVAL '7 days')) THEN 'High Risk'
        WHEN COALESCE(pa.pending_count, 0) > 2 THEN 'Attention Needed'
        ELSE 'Normal'
    END as risk_status
FROM public.external_users eu
JOIN client_stats cs ON cs.client_id = eu.id
LEFT JOIN last_interactions li ON li.client_id = eu.id
LEFT JOIN pending_actions pa ON pa.client_id = eu.id
WHERE EXISTS (
    -- Strict Access Control: Only Case Managers and Admins can see analytics rows
    SELECT 1 FROM public.user_firm_roles ufr
    WHERE ufr.user_id = auth.uid()
    AND ufr.status = 'active'
    AND ufr.role IN ('admin_manager', 'case_manager', 'admin')
);

SELECT '✅ Case Manager Analytics v1 Schema Applied' as status;
