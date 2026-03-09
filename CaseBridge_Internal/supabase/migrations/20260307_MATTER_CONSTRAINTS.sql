-- ==========================================
-- MATTER MANAGEMENT HARDENING & OPTIMIZATION
-- ==========================================

-- 1. Ensure indexes for staff assignment queries
CREATE INDEX IF NOT EXISTS idx_matters_assigned_associate ON public.matters(assigned_associate);
CREATE INDEX IF NOT EXISTS idx_matters_assigned_case_manager ON public.matters(assigned_case_manager);

-- 2. Lifecycle Validation Trigger
-- Prevents matter from moving to 'in_progress' without an assigned associate and case manager
CREATE OR REPLACE FUNCTION public.validate_matter_lifecycle_staff()
RETURNS TRIGGER AS $$
BEGIN
    -- If transitioning to 'in_progress' (or beyond, but usually start there)
    IF NEW.lifecycle_state = 'in_progress' AND OLD.lifecycle_state != 'in_progress' THEN
        IF NEW.assigned_associate IS NULL THEN
            RAISE EXCEPTION 'Matter cannot enter "In Progress" state without an assigned Associate Lawyer.';
        END IF;
        
        IF NEW.assigned_case_manager IS NULL THEN
            RAISE EXCEPTION 'Matter cannot enter "In Progress" state without an assigned Case Manager.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_matter_lifecycle_staff ON public.matters;
CREATE TRIGGER trg_validate_matter_lifecycle_staff
BEFORE UPDATE OF lifecycle_state ON public.matters
FOR EACH ROW
EXECUTE FUNCTION public.validate_matter_lifecycle_staff();

-- 3. Transition function enhancement (optional helper)
-- Already handled by RPC usually, but good to have logic consistent

SELECT '✅ Matter constraints and tracking optimization applied' AS status;
