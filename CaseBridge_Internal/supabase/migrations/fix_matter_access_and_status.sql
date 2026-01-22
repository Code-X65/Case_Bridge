-- ============================================================================
-- FIX: Matter Access for Case Managers & Claiming Logic
-- ============================================================================

-- 0. Link Invoices to Matters (Missing relationship in base schema)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES public.matters(id) ON DELETE SET NULL;

-- 1. Allow internal users to view matters
DROP POLICY IF EXISTS "Internal users can view firm matters" ON public.matters;
CREATE POLICY "Internal users can view firm matters"
ON public.matters FOR SELECT
USING (
    -- 1. Assigned to their firm
    (firm_id IS NOT NULL AND firm_id IN (
        SELECT f.firm_id FROM public.profiles f 
        WHERE f.id = auth.uid() 
        AND f.status = 'active'
    ))
    OR
    -- 2. Unassigned pool (VISIBLE TO ALL CASE MANAGERS/ADMINS)
    (firm_id IS NULL AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.internal_role IN ('admin_manager', 'case_manager')
        AND p.status = 'active'
    ))
    OR
    -- 3. Explicitly assigned to user (Associate fallback)
    EXISTS (
        SELECT 1 FROM public.case_assignments a
        WHERE a.matter_id = public.matters.id
        AND a.associate_id = auth.uid()
    )
);

-- 2. Update status change RPC to correctly claim firm_id when an internal user acts on a matter
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
    v_matter_firm_id UUID;
    v_actor_id UUID;
    v_actor_firm_id UUID;
    v_actor_role TEXT;
    v_is_client BOOLEAN;
    v_valid_transition BOOLEAN := FALSE;
BEGIN
    v_actor_id := auth.uid();
    
    -- Get actor details inclusive of firm_id
    SELECT firm_id, internal_role::TEXT INTO v_actor_firm_id, v_actor_role
    FROM public.profiles
    WHERE id = v_actor_id;

    v_is_client := (v_actor_role IS NULL);

    -- Get matter current state
    SELECT status, firm_id INTO v_current_status, v_matter_firm_id
    FROM public.matters
    WHERE id = p_matter_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Matter not found';
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
        -- If matter has no firm_id and an internal user is updating it, claim it for their firm
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

-- 3. Financial RLS for internal users
DROP POLICY IF EXISTS "Internal users can view firm invoices" ON public.invoices;
CREATE POLICY "Internal users can view firm invoices"
ON public.invoices FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
    AND (
        matter_id IN (SELECT id FROM public.matters WHERE firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid()))
        OR
        client_id IN (
            SELECT client_id FROM public.matters 
            WHERE firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
        )
    )
);

DROP POLICY IF EXISTS "Internal users can view firm payments" ON public.payments;
CREATE POLICY "Internal users can view firm payments"
ON public.payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

NOTIFY pgrst, 'reload schema';
