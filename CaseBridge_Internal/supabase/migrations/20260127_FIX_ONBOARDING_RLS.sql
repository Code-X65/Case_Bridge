-- ==========================================
-- FIX: ALLOW USERS TO COMPLETE ONBOARDING
-- ==========================================

-- 1. PROFILES: Allow users to UPDATE their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Verify and ensure SELECT is also correct (redundant but safe)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- 3. Diagnostic: Check if current user has the flag set
-- (This part is just for your manual check, you can't see the output in the app)

SELECT '✅ Onboarding Policies Fixed: Users can now update their profile state.' AS status;
