-- ==========================================
-- FIX: JOIN INTEGRITY & FOREIGN KEYS
-- ==========================================

-- 1. Update user_firm_roles to explicitly reference profiles
-- This allows PostgREST (Supabase API) to understand the join between roles and names
ALTER TABLE public.user_firm_roles 
    DROP CONSTRAINT IF EXISTS user_firm_roles_user_id_fkey,
    ADD CONSTRAINT user_firm_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Ensure basic columns exist (Mental check sync)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_state') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_state TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 3. Re-verify RLS allows this join
-- (You need to be able to see the profile to join it)
DROP POLICY IF EXISTS "p_colleagues" ON public.profiles;
CREATE POLICY "p_colleagues" ON public.profiles 
    FOR SELECT USING (
        id IN (SELECT user_id FROM public.user_firm_roles WHERE firm_id IN (SELECT f_id FROM public.get_my_firms()))
    );

SELECT '✅ Join integrity fixed. Staff list should load now.' AS status;
