-- ==========================================
-- EMERGENCY RLS RESET: BREAKING RECURSION
-- ==========================================

-- 1. DROP ALL POTENTIALLY CIRCULAR FUNCTIONS
DROP FUNCTION IF EXISTS public.is_firm_admin(UUID);
DROP FUNCTION IF EXISTS public.get_auth_user_firms();
DROP FUNCTION IF EXISTS public.is_auth_user_admin(UUID);

-- 2. CREATE STABLE SECURITY DEFINER HELPERS
-- These bypass RLS and run with admin privileges (breaking recursion)
CREATE OR REPLACE FUNCTION public.check_user_firm_access(p_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND firm_id = p_firm_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_user_is_admin(p_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND firm_id = p_firm_id
        AND role = 'admin_manager'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. RESET USER_FIRM_ROLES POLICIES
ALTER TABLE public.user_firm_roles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_firm_roles;
DROP POLICY IF EXISTS "Users can view colleagues in their firms" ON public.user_firm_roles;
DROP POLICY IF EXISTS "Admins have full access to firm roles" ON public.user_firm_roles;
DROP POLICY IF EXISTS "Admins can manage firm roles" ON public.user_firm_roles;
DROP POLICY IF EXISTS "Members can view firm colleagues" ON public.user_firm_roles;
ALTER TABLE public.user_firm_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UFR_Access_Self" ON public.user_firm_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "UFR_Access_Colleagues" ON public.user_firm_roles FOR SELECT USING (check_user_firm_access(firm_id));
CREATE POLICY "UFR_Admin_All" ON public.user_firm_roles FOR ALL USING (check_user_is_admin(firm_id));

-- 4. RESET PROFILES POLICIES
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Self manage profile" ON public.profiles;
DROP POLICY IF EXISTS "View colleagues profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view colleagues profiles" ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profile_Self_All" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Profile_View_Colleagues" ON public.profiles FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = public.profiles.id
        AND check_user_firm_access(firm_id)
    )
);

-- 5. RESET INVITATIONS POLICIES
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage firm invitations" ON public.invitations;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites_Admin_Manage" ON public.invitations FOR ALL USING (check_user_is_admin(firm_id));
CREATE POLICY "Invites_Member_View" ON public.invitations FOR SELECT USING (check_user_firm_access(firm_id));

SELECT '✅ Emergency RLS Reset Complete. Recursion loops destroyed.' AS status;
