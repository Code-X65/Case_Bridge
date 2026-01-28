-- ==========================================
-- FINAL FIX: ELIMINATE RLS RECURSION
-- ==========================================

-- 1. Create a function to get the current user's firms safely.
-- SECURITY DEFINER bypasses RLS for the table it queries.
CREATE OR REPLACE FUNCTION public.get_auth_user_firms()
RETURNS TABLE (firm_id UUID) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT ufr.firm_id 
    FROM public.user_firm_roles ufr
    WHERE ufr.user_id = auth.uid();
END;
$$;

-- 2. Create a function to check admin status safely.
CREATE OR REPLACE FUNCTION public.is_auth_user_admin(p_firm_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.user_firm_roles ufr
        WHERE ufr.user_id = auth.uid()
        AND ufr.firm_id = p_firm_id
        AND ufr.role = 'admin_manager'
        AND ufr.status = 'active'
    );
END;
$$;

-- 3. RESET POLICIES for user_firm_roles
ALTER TABLE public.user_firm_roles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage firm roles" ON public.user_firm_roles;
DROP POLICY IF EXISTS "Members can view firm colleagues" ON public.user_firm_roles;
ALTER TABLE public.user_firm_roles ENABLE ROW LEVEL SECURITY;

-- NEW NON-RECURSIVE POLICIES
CREATE POLICY "Users can view their own roles" ON public.user_firm_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view colleagues in their firms" ON public.user_firm_roles
    FOR SELECT USING (firm_id IN (SELECT get_auth_user_firms()));

CREATE POLICY "Admins have full access to firm roles" ON public.user_firm_roles
    FOR ALL USING (is_auth_user_admin(firm_id));

-- 4. RESET POLICIES for profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view colleagues profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Self manage profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "View colleagues profiles" ON public.profiles
    FOR SELECT USING (
        id IN (
            SELECT user_id 
            FROM public.user_firm_roles 
            WHERE firm_id IN (SELECT get_auth_user_firms())
        )
    );

SELECT '✅ Infinite recursion eliminated. RLS is now stable.' AS status;
