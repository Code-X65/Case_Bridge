-- ==========================================
-- LAUNCH PREPARATION: SCHEMA ALIGNMENT
-- ==========================================

-- 1. Update matter_messages_view to include external_users for client names
-- This replaces the join to the empty client_profiles table.
CREATE OR REPLACE VIEW public.matter_messages_view AS
SELECT 
    m.*,
    COALESCE(p.full_name, e.first_name || ' ' || e.last_name) as sender_name,
    p.role as sender_role,
    CASE 
        WHEN p.id IS NOT NULL THEN 'staff'
        WHEN e.id IS NOT NULL THEN 'client'
        ELSE 'unknown'
    END as sender_type
FROM public.matter_messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id
LEFT JOIN public.external_users e ON m.sender_id = e.id;

-- 2. Consolidate Notifications (Optional but recommended)
-- If client_notifications was intended to be separate, ensure it exists 
-- but for now we transition to the unified 'notifications' table in the backend.
-- This SQL just ensures the notifications table has necessary columns.
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'client_id') THEN
        ALTER TABLE public.notifications ADD COLUMN client_id UUID REFERENCES public.external_users(id);
    END IF;
END $$;

-- 3. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT '✅ Launch preparation migration completed' AS status;
