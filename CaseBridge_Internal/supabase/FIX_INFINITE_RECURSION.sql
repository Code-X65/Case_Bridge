-- ==========================================
-- FIX INFINITE RECURSION IN PROFILES POLICY
-- ==========================================

-- Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "staff_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "staff_all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create simple, non-recursive policies
-- Allow users to view their own profile
CREATE POLICY "view_own_profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "update_own_profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid());

-- Allow users to insert their own profile
CREATE POLICY "insert_own_profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- ==========================================
-- FIX OTHER TABLE POLICIES (NO RECURSION)
-- ==========================================

-- Drop and recreate documents policy
DROP POLICY IF EXISTS "staff_all_documents" ON public.documents;
CREATE POLICY "all_authenticated_documents" ON public.documents
FOR ALL TO authenticated
USING (true);

-- Drop and recreate report_documents policy
DROP POLICY IF EXISTS "staff_all_report_docs" ON public.report_documents;
CREATE POLICY "all_authenticated_report_docs" ON public.report_documents
FOR ALL TO authenticated
USING (true);

-- Drop and recreate matter_updates policy
DROP POLICY IF EXISTS "staff_all_updates" ON public.matter_updates;
CREATE POLICY "all_authenticated_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (true);

-- Drop and recreate case_meetings policy
DROP POLICY IF EXISTS "staff_all_meetings" ON public.case_meetings;
CREATE POLICY "all_authenticated_meetings" ON public.case_meetings
FOR ALL TO authenticated
USING (true);

-- Reload schema
NOTIFY pgrst, 'reload schema';

SELECT '✅ FIXED - Infinite recursion removed, all authenticated users have access' as status;
