-- ==========================================
-- QUICK FIX: Associate Progress Report Access
-- ==========================================
-- This adds missing RLS policies for matter_updates table

ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "admins_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "associates_manage_assigned_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "staff_all_updates" ON public.matter_updates;

-- Admin/CM can manage all progress reports
CREATE POLICY "admins_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_admin_or_case_manager())
WITH CHECK (public.is_admin_or_case_manager());

-- Associates can create and view progress reports for assigned cases
CREATE POLICY "associates_manage_assigned_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (
    public.is_associate_lawyer() 
    AND public.is_assigned_to_matter(matter_id)
)
WITH CHECK (
    public.is_associate_lawyer() 
    AND public.is_assigned_to_matter(matter_id)
);

NOTIFY pgrst, 'reload schema';

SELECT '✅ Associate Progress Report Access Fixed!' as status;
