-- ==========================================
-- PHASE 16: PRO CHAT UPGRADES (REPLIES & MENTIONS)
-- ==========================================

-- 1. Add reply and mention tracking to matter_messages
ALTER TABLE public.matter_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.matter_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb;

-- 2. Update the unified view to include reply context
-- We drop and recreate it to ensure the new columns are included and joined
DROP VIEW IF EXISTS public.matter_messages_view;

CREATE OR REPLACE VIEW public.matter_messages_view AS
SELECT 
    m.*,
    COALESCE(p.full_name, cp.full_name) as sender_name,
    p.role as sender_role,
    CASE 
        WHEN p.id IS NOT NULL THEN 'staff'
        WHEN cp.id IS NOT NULL THEN 'client'
        ELSE 'unknown'
    END as sender_type,
    -- Reply Context
    rm.content as reply_content,
    COALESCE(rp.full_name, rcp.full_name) as reply_sender_name
FROM public.matter_messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id
LEFT JOIN public.client_profiles cp ON m.sender_id = cp.id
-- Join with parent message for reply context
LEFT JOIN public.matter_messages rm ON m.reply_to_id = rm.id
LEFT JOIN public.profiles rp ON rm.sender_id = rp.id
LEFT JOIN public.client_profiles rcp ON rm.sender_id = rcp.id;

-- 3. Permissions
GRANT SELECT ON public.matter_messages_view TO authenticated;

-- 4. RPC to get unread count for a user in a matter
CREATE OR REPLACE FUNCTION public.get_unread_chat_count(p_matter_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.matter_messages
        WHERE matter_id = p_matter_id
          AND sender_id != auth.uid()
          AND is_read = FALSE
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_unread_chat_count(UUID) TO authenticated;

SELECT '✅ Phase 16: Pro Chat Upgrades initialized' AS status;
