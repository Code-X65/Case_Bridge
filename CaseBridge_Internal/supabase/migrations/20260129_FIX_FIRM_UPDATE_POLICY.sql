-- ==========================================================
-- FIX: ADD UPDATE POLICY FOR FIRMS TABLE
-- ==========================================================

-- Ensure RLS is enabled
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

-- Allow Admin Managers to update their firm details
DROP POLICY IF EXISTS "Admins can update their own firm" ON public.firms;
CREATE POLICY "Admins can update their own firm" ON public.firms
    FOR UPDATE
    USING (public.is_firm_admin(id))
    WITH CHECK (public.is_firm_admin(id));

-- Ensure they can also select it (already exists but good to be sure)
DROP POLICY IF EXISTS "Users can view their own firm" ON public.firms;
CREATE POLICY "Users can view their own firm" ON public.firms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_firm_roles 
            WHERE user_id = auth.uid() AND firm_id = public.firms.id
        )
    );

SELECT '✅ Update policy added to firms table.' as status;
