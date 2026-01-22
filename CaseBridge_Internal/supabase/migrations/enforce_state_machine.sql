-- ============================================================================
-- CANONICAL CASE STATUS STATE MACHINE ENFORCEMENT
-- ============================================================================

-- 1. Migate existing data to canonical statuses
-- 'Active' -> 'In Progress'
-- 'Under Review' -> 'In Review'
UPDATE public.matters SET status = 'In Progress' WHERE status = 'Active';
UPDATE public.matters SET status = 'In Review' WHERE status = 'Under Review';

-- 2. Create the State Transition Function
CREATE OR REPLACE FUNCTION public.handle_matter_status_change(
    p_matter_id UUID,
    p_new_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run as owner to bypass RLS for the log insertion if needed, but we check perms manually
AS $$
DECLARE
    v_current_status TEXT;
    v_firm_id UUID;
    v_actor_id UUID;
    v_actor_role TEXT;
    v_actor_email TEXT;
    v_is_client BOOLEAN;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    -- Get current user context
    v_actor_id := auth.uid();
    
    -- Get actor details
    SELECT 
        email, 
        internal_role::TEXT
    INTO 
        v_actor_email, 
        v_actor_role
    FROM public.profiles
    WHERE id = v_actor_id;

    -- Determine if client or internal
    v_is_client := (v_actor_role IS NULL); -- Internal users have roles, clients don't (in this schema context)

    -- Get matter current state
    SELECT status, firm_id INTO v_current_status, v_firm_id
    FROM public.matters
    WHERE id = p_matter_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Matter not found';
    END IF;

    -- ========================================================================
    -- STATE TRANSITION MATRIX
    -- ========================================================================
    
    -- CASE MANAGER TRANSITIONS
    IF v_actor_role = 'case_manager' THEN
        IF v_current_status = 'Pending Review' AND p_new_status IN ('In Review', 'Rejected') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'In Review' AND p_new_status IN ('Awaiting Documents', 'Assigned') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'Assigned' AND p_new_status IN ('In Progress') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'In Progress' AND p_new_status IN ('On Hold', 'Completed') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'On Hold' AND p_new_status IN ('In Progress') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'Completed' AND p_new_status IN ('Closed') THEN v_valid_transition := TRUE; END IF;
        
        -- Allow "Awaiting Documents" -> "In Review" manually if needed, though usually client triggers it?
        -- For safety, Case Manager can virtually move anything except Closed/Rejected strictly
        -- But strictly following the prompt:
        -- "Awaiting Documents" -> "In Review" is usually Client trigger? Prompt says "Client uploads docs". 
        -- But Case Manager might manually move it back. Let's allow it for flexibility unless explicitly forbidden.
        -- Prompt says "Authority Matrix" is strict.
        -- Matrix: Awaiting Documents -> In Review (Client). 
        -- I will STRICTLY follow the matrix. Case Manager cannot do this transition based on the matrix provided?
        -- Actually, typically managers can override. But the prompt says "Authorized Actor".
        -- I will stick to the matrix. If Case Manager needs to fix it, they might need 'admin' powers or we assume they can override.
        -- Wait, prompt section 4 says "Awaiting Documents -> In Review | Client". It does NOT list Case Manager.
        -- However, usually manual overrides are necessary.
        -- I'll allow simple "rollback" or "fix" transitions if practical, BUT prompt says "This document is canonical... No other case states or transitions".
        -- I will implement EXACTLY the matrix.
        
    END IF;

    -- CLIENT TRANSITIONS
    IF v_is_client THEN
        IF v_current_status = 'Draft' AND p_new_status = 'Pending Review' THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'Awaiting Documents' AND p_new_status = 'In Review' THEN v_valid_transition := TRUE; END IF;
    END IF;

    -- ASSOCIATE / ADMIN TRANSITIONS (Explicitly Forbidden in Prompt for status changes)
    -- "Associate Lawyer cannot change case status"
    -- "Admin Manager cannot change case status"
    
    -- CHECK VALIDITY
    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'Invalid Status Transition: % -> % are not allowed for role %', v_current_status, p_new_status, COALESCE(v_actor_role, 'client');
    END IF;

    -- ========================================================================
    -- EXECUTE UPDATE
    -- ========================================================================

    UPDATE public.matters
    SET 
        status = p_new_status,
        firm_id = COALESCE(firm_id, v_firm_id), -- Claim matter for the firm if unassigned
        updated_at = NOW()
    WHERE id = p_matter_id;

    -- ========================================================================
    -- LOGGING (Mandatory)
    -- ========================================================================
    
    INSERT INTO public.case_logs (
        matter_id,
        action,
        details,
        performed_by
    ) VALUES (
        p_matter_id,
        'status_changed',
        jsonb_build_object(
            'previous_status', v_current_status,
            'new_status', p_new_status,
            'note', p_note,
            'actor_role', v_actor_role
        ),
        v_actor_id
    );
    
    -- Also log to audit_logs for internal compliance
    IF v_firm_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (
            firm_id,
            actor_id,
            action,
            details
        ) VALUES (
            v_firm_id,
            v_actor_id,
            'case_status_changed',
            jsonb_build_object(
                'matter_id', p_matter_id,
                'previous_status', v_current_status,
                'new_status', p_new_status
            )
        );
    END IF;

    RETURN jsonb_build_object('success', true, 'new_status', p_new_status);
END;
$$;

-- 3. Add CHECK constraint (or ensure status column integrity if using text)
-- We can add a check constraint to ensure only valid statuses exist
ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_status_check;
ALTER TABLE public.matters ADD CONSTRAINT matters_status_check 
CHECK (status IN (
    'Draft', 
    'Pending Review', 
    'In Review', 
    'Awaiting Documents', 
    'Assigned', 
    'In Progress', 
    'On Hold', 
    'Completed', 
    'Closed', 
    'Rejected'
));
