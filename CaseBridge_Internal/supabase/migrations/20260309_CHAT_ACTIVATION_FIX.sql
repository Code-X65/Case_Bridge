-- ==========================================
-- PHASE 14: CHAT ACTIVATION SYSTEM (FIX)
-- ==========================================

-- 1. Ensure columns exist
ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS is_chat_enabled BOOLEAN DEFAULT FALSE;

-- 2. Audit log helper (Ensure it exists from previous phase)
CREATE OR REPLACE FUNCTION public.log_matter_event(
    p_matter_id UUID, 
    p_action TEXT, 
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_firm_id UUID;
    v_user_id UUID;
BEGIN
    -- Get user_id safely from auth.uid()
    v_user_id := auth.uid();
    
    SELECT firm_id INTO v_firm_id FROM public.matters WHERE id = p_matter_id;
    
    IF v_firm_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (firm_id, user_id, matter_id, action, details)
        VALUES (v_firm_id, v_user_id, p_matter_id, p_action, p_details);
    END IF;
END;
$$;

-- 3. Toggle Chat RPC
-- We use a more robust version with explicit schema and better search path
CREATE OR REPLACE FUNCTION public.toggle_matter_chat(p_matter_id UUID, p_enabled BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- check if matter exists and update it
    UPDATE public.matters 
    SET is_chat_enabled = p_enabled 
    WHERE id = p_matter_id;
    
    -- log the event
    PERFORM public.log_matter_event(
        p_matter_id, 
        CASE WHEN p_enabled THEN 'chat_activated' ELSE 'chat_deactivated' END,
        jsonb_build_object('status', p_enabled)
    );
END;
$$;

-- 4. Explicit Grants (Crucial for PostgREST to find the function for authenticated users)
GRANT EXECUTE ON FUNCTION public.toggle_matter_chat(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_matter_chat(UUID, BOOLEAN) TO service_role;

-- 5. RLS Adjustments for matters (to ensure clients can see the flag)
-- Ensure there's a policy for clients to see their flags
-- (Assuming standard matter visibility policy exists, adding a fallback just in case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'matters' AND policyname = 'Clients can view their own matters'
    ) THEN
        CREATE POLICY "Clients can view their own matters"
        ON public.matters FOR SELECT
        USING (client_id = auth.uid());
    END IF;
END $$;

SELECT '✅ Chat Activation System fixed and re-enabled' AS status;
