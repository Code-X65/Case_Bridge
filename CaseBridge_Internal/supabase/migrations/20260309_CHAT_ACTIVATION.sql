-- ==========================================
-- PHASE 14: CHAT ACTIVATION SYSTEM
-- ==========================================

-- 1. Add activation flag to matters
ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS is_chat_enabled BOOLEAN DEFAULT FALSE;

-- 2. Update RLS for matter_messages to respect activation status
-- Note: We check if chat is enabled OR if the user is internal staff
DROP POLICY IF EXISTS "Users can view messages for their assigned matters" ON public.matter_messages;
CREATE POLICY "Users can view messages for their assigned matters"
ON public.matter_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = matter_messages.matter_id
        AND (
            -- Staff can always see messages if assigned
            m.assigned_associate = auth.uid() OR
            m.assigned_case_manager = auth.uid() OR
            EXISTS (SELECT 1 FROM public.user_firm_roles ufr WHERE ufr.user_id = auth.uid() AND ufr.role = 'admin_manager') OR
            -- Clients can only see messages if chat is enabled
            (m.client_id = auth.uid() AND m.is_chat_enabled = TRUE)
        )
    )
);

DROP POLICY IF EXISTS "Users can send messages to their assigned matters" ON public.matter_messages;
CREATE POLICY "Users can send messages to their assigned matters"
ON public.matter_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = matter_messages.matter_id
        AND (
            -- Staff can always send messages if assigned
            m.assigned_associate = auth.uid() OR
            m.assigned_case_manager = auth.uid() OR
            -- Clients can only send messages if chat is enabled
            (m.client_id = auth.uid() AND m.is_chat_enabled = TRUE)
        )
    )
);

-- 3. Audit log helper for activation
CREATE OR REPLACE FUNCTION public.toggle_matter_chat(p_matter_id UUID, p_enabled BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.matters 
    SET is_chat_enabled = p_enabled 
    WHERE id = p_matter_id;
    
    PERFORM public.log_matter_event(
        p_matter_id, 
        CASE WHEN p_enabled THEN 'chat_activated' ELSE 'chat_deactivated' END,
        jsonb_build_object('status', p_enabled)
    );
END;
$$;

SELECT '✅ Chat Activation System enabled (Phase 14)' AS status;
