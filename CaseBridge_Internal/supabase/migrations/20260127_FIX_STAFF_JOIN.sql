-- ==========================================
-- FIX: STAFF JOIN INTEGRITY
-- ==========================================

-- 1. Explicitly link Roles to Profiles
-- This tells the API: "To find user details, look at the profiles table"
ALTER TABLE public.user_firm_roles 
    DROP CONSTRAINT IF EXISTS user_firm_roles_user_id_fkey,
    ADD CONSTRAINT user_firm_roles_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Verify Profile Schema compatibility
-- Ensure columns requested by the frontend (full_name, onboarding_state) exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_state') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_state TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 3. Cache Refresh Policy
-- Dropping and re-applying the read policy forces a schema cache refresh
DROP POLICY IF EXISTS "ufr_read" ON public.user_firm_roles;
CREATE POLICY "ufr_read" ON public.user_firm_roles FOR SELECT USING (
    user_id = auth.uid() OR firm_id IN (SELECT f_id FROM public.get_my_firms())
);

SELECT '✅ Integrity fixed. The staff list should load correctly now.' AS status;
