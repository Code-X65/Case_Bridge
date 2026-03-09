-- ==========================================
-- PHASE 15: PREMIUM REAL-TIME CHAT SCHEMA
-- ==========================================

-- 1. Enhance matter_messages with state tracking
ALTER TABLE public.matter_messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- 2. Indexing for performance
CREATE INDEX IF NOT EXISTS idx_matter_messages_matter_id ON public.matter_messages(matter_id);
CREATE INDEX IF NOT EXISTS idx_matter_messages_is_read ON public.matter_messages(is_read) WHERE is_read = FALSE;

-- 3. RPC to mark messages as read
-- This will mark all messages in a matter that were NOT sent by the caller as read.
CREATE OR REPLACE FUNCTION public.mark_matter_messages_read(p_matter_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.matter_messages
    SET is_read = TRUE,
        read_at = NOW()
    WHERE matter_id = p_matter_id
      AND sender_id != auth.uid()
      AND is_read = FALSE;
END;
$$;

-- 4. Permissions
GRANT EXECUTE ON FUNCTION public.mark_matter_messages_read(UUID) TO authenticated;

-- 5. Realtime: Ensure matter_messages is on the realtime publication
-- (If not already handled by a wildcard or previous phase)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'matter_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.matter_messages;
    END IF;
END $$;

SELECT '✅ Phase 15: Premium Chat Schema initialized' AS status;
