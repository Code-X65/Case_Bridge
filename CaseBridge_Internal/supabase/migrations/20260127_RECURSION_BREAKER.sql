-- ==========================================
-- RECURSION BREAKER: THE FINAL FIX
-- ==========================================

-- 1. CLEANUP: Remove all problematic recursive functions and policies
DROP FUNCTION IF EXISTS public.check_user_firm_access(UUID);
DROP FUNCTION IF EXISTS public.check_user_is_admin(UUID);

-- 2. USER_FIRM_ROLES: Non-recursive policies
-- A user can see their OWN role.
-- A user can see COLLEAGUES only if they have an active session for that firm.
ALTER TABLE public.user_firm_roles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "UFR_Access_Self" ON public.user_firm_roles;
DROP POLICY IF EXISTS "UFR_Access_Colleagues" ON public.user_firm_roles;
DROP POLICY IF EXISTS "UFR_Admin_All" ON public.user_firm_roles;
DROP POLICY IF EXISTS "Admins can manage firm roles" ON public.user_firm_roles;
DROP POLICY IF EXISTS "Members can view firm colleagues" ON public.user_firm_roles;
ALTER TABLE public.user_firm_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "UFR_Self_Read" ON public.user_firm_roles 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "UFR_Session_Based_Read" ON public.user_firm_roles 
    FOR SELECT USING (
        firm_id IN (
            SELECT firm_id FROM public.internal_sessions 
            WHERE user_id = auth.uid() 
            AND expires_at > NOW()
        )
    );

CREATE POLICY "UFR_Admin_Manage" ON public.user_firm_roles 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.internal_sessions 
            WHERE user_id = auth.uid() 
            AND firm_id = public.user_firm_roles.firm_id 
            AND role = 'admin_manager'
            AND expires_at > NOW()
        )
    );

-- 3. PROFILES: Non-recursive policies
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profile_Self_All" ON public.profiles;
DROP POLICY IF EXISTS "Profile_View_Colleagues" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view colleagues profiles" ON public.profiles;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles_Self_All" ON public.profiles 
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Profiles_Colleague_Read" ON public.profiles 
    FOR SELECT USING (
        id IN (
            SELECT user_id FROM public.user_firm_roles 
            WHERE firm_id IN (
                SELECT firm_id FROM public.internal_sessions 
                WHERE user_id = auth.uid() AND expires_at > NOW()
            )
        )
    );

-- 4. INVITATIONS: Non-recursive policies
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invites_Admin_Manage" ON public.invitations;
DROP POLICY IF EXISTS "Invites_Member_View" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage firm invitations" ON public.invitations;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invites_Admin_Manage" ON public.invitations 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.internal_sessions 
            WHERE user_id = auth.uid() 
            AND firm_id = public.invitations.firm_id 
            AND role = 'admin_manager'
            AND expires_at > NOW()
        )
    );

CREATE POLICY "Invites_Member_Read" ON public.invitations 
    FOR SELECT USING (
        firm_id IN (
            SELECT firm_id FROM public.internal_sessions 
            WHERE user_id = auth.uid() AND expires_at > NOW()
        )
    );

SELECT '✅ Recursion broken. Security is now session-bound.' AS status;
