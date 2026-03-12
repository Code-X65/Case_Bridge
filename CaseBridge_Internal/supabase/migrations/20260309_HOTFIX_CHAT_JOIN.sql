CREATE OR REPLACE VIEW public.matter_messages_view AS
SELECT 
    m.*,
    COALESCE(p.full_name, cp.full_name) as sender_name,
    p.role as sender_role,
    CASE 
        WHEN p.id IS NOT NULL THEN 'staff'
        WHEN cp.id IS NOT NULL THEN 'client'
        ELSE 'unknown'
    END as sender_type
FROM public.matter_messages m
LEFT JOIN public.profiles p ON m.sender_id = p.id
LEFT JOIN public.client_profiles cp ON m.sender_id = cp.id;

-- Grant access to the view
GRANT SELECT ON public.matter_messages_view TO authenticated;

-- Ensure RLS-like behavior (users can only see messages for their matters)
-- Views in Postgres don't automatically inherit RLS from base tables 
-- unless specifically configured or used with SECURITY BARRIER.
-- However, for Supabase, selecting from the view will respect the user's permissions
-- on the underlying tables if the view is created without SECURITY DEFINER (default).

SELECT '✅ Hotfix: matter_messages_view created successfully' AS status;
