-- ==========================================
-- FIX: RECURSIVE RLS ON PROFILES
-- ==========================================

-- The previous policy caused infinite recursion because user_firm_roles might query profiles 
-- (or vice versa in complex joins) or simply because of the join structure.
-- Let's simplify the collaegue visibility check.

-- 1. DROP the problematic policy
DROP POLICY IF EXISTS "Users can view colleagues profiles" ON public.profiles;

-- 2. CREATE a simpler non-recursive policy for Profiles
-- A user can see a profile IF:
-- a) It is their own profile (auth.uid() = id)
-- b) OR they share a firm_id in user_firm_roles
-- (We use a direct lookup to avoid complex joins that might trigger RLS loops)

CREATE POLICY "Users can view colleagues profiles" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id 
        OR 
        EXISTS (
            SELECT 1 
            FROM public.user_firm_roles AS my_role
            JOIN public.user_firm_roles AS their_role ON my_role.firm_id = their_role.firm_id
            WHERE my_role.user_id = auth.uid() 
            AND their_role.user_id = public.profiles.id
        )
    );

-- 3. Safety: Ensure user_firm_roles is accessible
-- (Re-applying this to be sure)
DROP POLICY IF EXISTS "Members can view firm colleagues" ON public.user_firm_roles;
CREATE POLICY "Members can view firm colleagues" ON public.user_firm_roles
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        firm_id IN (
            SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid()
        )
    );

SELECT '✅ Recursive RLS fix applied.' AS status;
