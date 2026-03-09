-- ==========================================
-- SLA & BOTTLENECK ANALYSIS VIEWS
-- ==========================================

-- 1. View: Matter Cycle Times per Stage
-- Calculates how long each matter spends in each stage
CREATE OR REPLACE VIEW public.matter_stage_durations AS
SELECT 
    m.id AS matter_id,
    m.title AS matter_title,
    m.firm_id,
    m.assigned_associate,
    m.assigned_case_manager,
    cs.name AS stage_name,
    cs.order_index,
    -- Calculate duration: if it's the current stage, use NOW() - updated_at
    -- (This assumes matter.updated_at tracks the latest stage transition)
    -- A more robust version would use audit_logs, but let's start with this:
    CASE 
        WHEN m.current_stage_id = cs.id THEN EXTRACT(EPOCH FROM (NOW() - m.updated_at)) / 3600
        ELSE NULL -- Historically we'd need a stage_history table, but for bottleneck we focus on the ACTIVE stagnancy
    END AS hours_in_current_stage
FROM public.matters m
JOIN public.case_stages cs ON cs.pipeline_id = m.pipeline_id;

-- 2. View: Firm-wide Stagnancy Risk
-- Flags matters that have been in the same stage for more than 5 days (120 hours)
CREATE OR REPLACE VIEW public.stagnancy_risk_report AS
SELECT 
    m.id AS matter_id,
    m.title,
    m.firm_id,
    p.full_name AS associate_name,
    cs.name AS current_stage,
    EXTRACT(DAY FROM (NOW() - m.updated_at)) AS days_stagnant
FROM public.matters m
LEFT JOIN public.profiles p ON p.id = m.assigned_associate
LEFT JOIN public.case_stages cs ON cs.id = m.current_stage_id
WHERE m.lifecycle_state = 'in_progress'
AND (NOW() - m.updated_at) > INTERVAL '5 days';

-- 3. View: Staff Workload Heatmap
-- Counts active matters per associate vs average cycle time
CREATE OR REPLACE VIEW public.staff_workload_metrics AS
SELECT 
    p.id AS user_id,
    p.full_name,
    p.firm_id,
    COUNT(m.id) FILTER (WHERE m.lifecycle_state = 'in_progress') AS active_matters,
    COUNT(m.id) FILTER (WHERE m.lifecycle_state = 'closed') AS closed_matters_total
FROM public.profiles p
LEFT JOIN public.matters m ON m.assigned_associate = p.id
GROUP BY p.id, p.full_name, p.firm_id;

SELECT '✅ SLA Analytics Views Created.' AS status;
