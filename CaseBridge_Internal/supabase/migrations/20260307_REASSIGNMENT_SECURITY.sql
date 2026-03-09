-- ==========================================
-- REASSIGNMENT ACCESS CONTROL (ADMIN ONLY)
-- ==========================================

-- Function to check if a user is an admin_manager OR admin
CREATE OR REPLACE FUNCTION public.is_admin_manager(p_user_id UUID, p_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = p_user_id
        AND firm_id = p_firm_id
        AND role IN ('admin_manager', 'admin')
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent unauthorized reassignment of matters
CREATE OR REPLACE FUNCTION public.enforce_admin_reassignment()
RETURNS TRIGGER AS $$
DECLARE
    v_performer_id UUID;
BEGIN
    -- Get the ID of the user performing the update (from JWT)
    v_performer_id := auth.uid();

    -- Check if the assignment columns are being changed
    IF (OLD.assigned_associate IS DISTINCT FROM NEW.assigned_associate) OR 
       (OLD.assigned_case_manager IS DISTINCT FROM NEW.assigned_case_manager) THEN
        
        -- If the performer is not an admin_manager, block it
        IF NOT public.is_admin_manager(v_performer_id, NEW.firm_id) THEN
            RAISE EXCEPTION 'Access Denied: Only Admin Managers can modify staff assignments.';
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_admin_reassignment ON public.matters;
CREATE TRIGGER trg_enforce_admin_reassignment
BEFORE UPDATE ON public.matters
FOR EACH ROW
EXECUTE FUNCTION public.enforce_admin_reassignment();

SELECT '✅ Reassignment security: Strictly enforced at Admin Manager level' AS status;
