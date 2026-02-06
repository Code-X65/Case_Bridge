-- ==========================================
-- UNIVERSAL FIX: Allow all staff to submit progress reports
-- ==========================================

ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "admins_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "associates_manage_assigned_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "staff_all_updates" ON public.matter_updates;

-- Create a single policy: All staff can manage progress reports
CREATE POLICY "staff_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

NOTIFY pgrst, 'reload schema';

SELECT '✅ Universal Staff Access to Progress Reports Enabled!' as status;
