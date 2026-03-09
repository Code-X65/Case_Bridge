-- ==========================================
-- PHASE 14: CHAT ACTIVATION SYSTEM (NUKING FIX)
-- ==========================================

-- 1. Drop existing functions to prevent overloading conflicts
DROP FUNCTION IF EXISTS public.toggle_matter_chat(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.toggle_matter_chat(TEXT, BOOLEAN);

-- 2. Ensure column exists
ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS is_chat_enabled BOOLEAN DEFAULT FALSE;

-- 3. Robust Audit Logger (handles text and uuid)
CREATE OR REPLACE FUNCTION public.log_matter_event_v2(
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
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    
    -- Try to find the firm_id for this matter
    SELECT firm_id INTO v_firm_id FROM public.matters WHERE id = p_matter_id;
    
    IF v_firm_id IS NOT NULL THEN
        INSERT INTO public.audit_logs (firm_id, user_id, matter_id, action, details)
        VALUES (v_firm_id, v_actor_id, p_matter_id, p_action, p_details);
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Fallback: don't crash the whole transaction if logging fails
    RAISE NOTICE 'Audit log failed: %', SQLERRM;
END;
$$;

-- 4. Re-defined Toggle Chat RPC (using TEXT for ID to avoid PostgREST type ambiguity)
CREATE OR REPLACE FUNCTION public.toggle_matter_chat_v2(matter_id_input TEXT, enabled_input BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_matter_id UUID;
BEGIN
    -- Cast text to UUID
    v_matter_id := matter_id_input::UUID;
    
    -- Perform update
    UPDATE public.matters 
    SET is_chat_enabled = enabled_input 
    WHERE id = v_matter_id;
    
    -- Log event
    PERFORM public.log_matter_event_v2(
        v_matter_id, 
        CASE WHEN enabled_input THEN 'chat_activated' ELSE 'chat_deactivated' END,
        jsonb_build_object('status', enabled_input)
    );
    
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Toggle failed: %', SQLERRM;
END;
$$;

-- 5. Permissions
GRANT EXECUTE ON FUNCTION public.toggle_matter_chat_v2(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_matter_chat_v2(TEXT, BOOLEAN) TO service_role;

SELECT '✅ Chat Activation System Nuked and Restored (v2)' AS status;
