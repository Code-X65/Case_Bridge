-- ============================================================================
-- EMERGENCY VISIBILITY FIX (Internal Users)
-- ============================================================================

-- 1. Relax PROFILE visibility for Internal Staff
-- (Ensures Case Managers can see Clients and Associates during joins)
DROP POLICY IF EXISTS "Internal users can view firm profiles" ON public.profiles;
CREATE POLICY "Internal users can view all profiles"
ON public.profiles FOR SELECT
USING (
    id = auth.uid() -- Can always see self
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

-- 2. Relax MATTER visibility for Internal Staff
-- (Ensures Case Managers can see ALL matters to prevent "Case Not Found" during intake)
DROP POLICY IF EXISTS "Internal users can view firm matters" ON public.matters;
DROP POLICY IF EXISTS "Internal users can view matters" ON public.matters;
CREATE POLICY "Internal users can view matters"
ON public.matters FOR SELECT
USING (
    client_id = auth.uid() -- Client self-view
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

-- 3. Relax MATTER update permissions for Internal Staff
DROP POLICY IF EXISTS "Case managers can update matters" ON public.matters;
DROP POLICY IF EXISTS "Internal users can update matters" ON public.matters;
CREATE POLICY "Managers can update matters"
ON public.matters FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
);

-- 4. Enable Case Managers to CLAIM matters easily
-- Update the RPC to skip firm_id checks if firm_id is null on the matter
CREATE OR REPLACE FUNCTION public.handle_matter_status_change(
    p_matter_id UUID,
    p_new_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
    v_actor_id UUID;
    v_actor_firm_id UUID;
    v_actor_role TEXT;
    v_is_client BOOLEAN;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    v_actor_id := auth.uid();
    
    SELECT firm_id, internal_role::TEXT INTO v_actor_firm_id, v_actor_role
    FROM public.profiles
    WHERE id = v_actor_id;

    v_is_client := (v_actor_role IS NULL);

    SELECT status INTO v_current_status
    FROM public.matters
    WHERE id = p_matter_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Matter not found or access denied';
    END IF;

    -- AUTHORITY CHECK
    IF v_actor_role = 'case_manager' THEN
        IF v_current_status = 'Pending Review' AND p_new_status IN ('In Review', 'Rejected') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'In Review' AND p_new_status IN ('Awaiting Documents', 'Assigned') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'Assigned' AND p_new_status IN ('In Progress') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'In Progress' AND p_new_status IN ('On Hold', 'Completed') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'On Hold' AND p_new_status IN ('In Progress') THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'Completed' AND p_new_status IN ('Closed') THEN v_valid_transition := TRUE; END IF;
    ELSIF v_is_client THEN
        IF v_current_status = 'Draft' AND p_new_status = 'Pending Review' THEN v_valid_transition := TRUE; END IF;
        IF v_current_status = 'Awaiting Documents' AND p_new_status = 'In Review' THEN v_valid_transition := TRUE; END IF;
    END IF;

    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'Invalid Status Transition: % -> % are not allowed for role %', v_current_status, p_new_status, COALESCE(v_actor_role, 'client');
    END IF;

    -- UPDATE WITH FIRM CLAIMING
    UPDATE public.matters
    SET 
        status = p_new_status,
        firm_id = COALESCE(firm_id, v_actor_firm_id),
        updated_at = NOW()
    WHERE id = p_matter_id;

    -- LOGGING
    INSERT INTO public.case_logs (matter_id, action, details, performed_by)
    VALUES (p_matter_id, 'status_changed', jsonb_build_object(
        'previous_status', v_current_status,
        'new_status', p_new_status,
        'note', p_note
    ), v_actor_id);
    
    RETURN jsonb_build_object('success', true, 'new_status', p_new_status);
END;
$$;

NOTIFY pgrst, 'reload schema';
