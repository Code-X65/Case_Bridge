-- ==========================================
-- FIX: STAFF FETCH INTEGRITY (FOREIGN KEYS)
-- ==========================================

-- 1. Explicitly link roles to profiles for join discovery
-- This is what the frontend needs to find "full_name" from "user_id"
ALTER TABLE public.user_firm_roles 
    DROP CONSTRAINT IF EXISTS user_firm_roles_user_id_fkey;

ALTER TABLE public.user_firm_roles 
    ADD CONSTRAINT user_firm_roles_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 2. Grant necessary permissions just in case
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_firm_roles TO authenticated;

-- 3. Diagnostic: Ensure the columns requested in the query actually exist
DO $$ 
BEGIN 
    -- Ensure full_name exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    
    -- Ensure onboarding_state exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_state') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_state TEXT DEFAULT 'pending';
    END IF;
END $$;

SELECT '✅ Integrity fixed. Staff fetch relationship established.' AS status;
