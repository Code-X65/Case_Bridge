-- ==========================================
-- FIX: FIRM-SCOPED RLS POLICIES
-- ==========================================

-- 1. FIX: INVITATIONS POLICY (Admins only)
-- Ensure only admins of the firm can insert/select/delete invitations for that firm
DROP POLICY IF EXISTS "Admins can manage firm invitations" ON public.invitations;
CREATE POLICY "Admins can manage firm invitations" ON public.invitations
    FOR ALL
    USING (public.is_firm_admin(firm_id))
    WITH CHECK (public.is_firm_admin(firm_id));

-- 2. FIX: USER_FIRM_ROLES_POLICY
-- Ensure members can see who else is in their firm (for the staff list)
-- The existing policy "Admins can manage firm roles" only allowed admins.
-- We need a "Members can view firm colleagues" policy.
DROP POLICY IF EXISTS "Members can view firm colleagues" ON public.user_firm_roles;
CREATE POLICY "Members can view firm colleagues" ON public.user_firm_roles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_firm_roles AS my_role
            WHERE my_role.user_id = auth.uid()
            AND my_role.firm_id = public.user_firm_roles.firm_id
        )
    );

-- 3. FIX: PROFILES POLICY
-- The user list tries to fetch profile data (full_name, etc.) via a join.
-- The existing policy "Users can view their own profile" is too restrictive.
-- We need "Users can view profiles of colleagues in the same firm".
DROP POLICY IF EXISTS "Users can view colleagues profiles" ON public.profiles;
CREATE POLICY "Users can view colleagues profiles" ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_firm_roles AS my_role
            JOIN public.user_firm_roles AS their_role ON my_role.firm_id = their_role.firm_id
            WHERE my_role.user_id = auth.uid()
            AND their_role.user_id = public.profiles.id
        )
    );

SELECT '✅ Firm-scoped RLS policies fixed.' AS status;
