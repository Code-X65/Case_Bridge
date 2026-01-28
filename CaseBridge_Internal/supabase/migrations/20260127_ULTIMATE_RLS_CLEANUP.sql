-- ==========================================
-- ULTIMATE RLS CLEANUP: THE RECURSION KILLER
-- ==========================================

-- 1. DISABLE RLS ON EVERYTHING TO CLEAR THE CACHE
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_firm_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.firms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_sessions DISABLE ROW LEVEL SECURITY;

-- 2. DROP EVERY SINGLE POLICY WE HAVE EVER CREATED
DO $$ 
DECLARE 
    pol RECORD;
BEGIN 
    FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- 3. DROP ALL HELPER FUNCTIONS (Starting clean)
DROP FUNCTION IF EXISTS public.is_firm_admin(UUID);
DROP FUNCTION IF EXISTS public.get_auth_user_firms();
DROP FUNCTION IF EXISTS public.is_auth_user_admin(UUID);
DROP FUNCTION IF EXISTS public.check_user_firm_access(UUID);
DROP FUNCTION IF EXISTS public.check_user_is_admin(UUID);

-- 4. CREATE THE "TRUTH" FUNCTIONS (SECURITY DEFINER = NO RLS TRIGGERED)
-- These functions are the ONLY way we will check cross-table permissions.
CREATE OR REPLACE FUNCTION public.get_my_firms()
RETURNS TABLE (f_id UUID) 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.i_am_admin(p_firm_id UUID)
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND firm_id = p_firm_id 
        AND role = 'admin_manager'
    );
$$;

-- 5. RE-ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_firm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_sessions ENABLE ROW LEVEL SECURITY;

-- 6. APPLY CLEAN, FLAT POLICIES

-- PROFILES: You can manage YOURSELF. You can see COLLEAGUES.
CREATE POLICY "p_self" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "p_colleagues" ON public.profiles FOR SELECT USING (
    id IN (SELECT user_id FROM public.user_firm_roles WHERE firm_id IN (SELECT get_my_firms()))
);

-- USER_FIRM_ROLES: You can see your roles and your colleagues roles.
CREATE POLICY "ufr_read" ON public.user_firm_roles FOR SELECT USING (
    user_id = auth.uid() OR firm_id IN (SELECT get_my_firms())
);
CREATE POLICY "ufr_admin" ON public.user_firm_roles FOR ALL USING (i_am_admin(firm_id));

-- FIRMS: You can see firms you belong to.
CREATE POLICY "f_read" ON public.firms FOR SELECT USING (id IN (SELECT get_my_firms()));

-- INVITATIONS: Admin can manage, members can see.
CREATE POLICY "inv_manage" ON public.invitations FOR ALL USING (i_am_admin(firm_id));
CREATE POLICY "inv_read" ON public.invitations FOR SELECT USING (firm_id IN (SELECT get_my_firms()));

-- SESSIONS: Simple ownership.
CREATE POLICY "sess_owner" ON public.internal_sessions FOR ALL USING (auth.uid() = user_id);

SELECT '✅ Ultimate RLS Cleanup Complete. All loops destroyed.' AS status;
