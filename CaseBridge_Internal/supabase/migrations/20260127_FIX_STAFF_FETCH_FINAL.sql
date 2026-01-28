-- ==========================================
-- FINAL FIX: STAFF FETCH RELATIONSHIPS
-- ==========================================

-- 1. Explicitly link user_firm_roles to profiles table
-- This is required for the frontend's join query to translate correctly to SQL
ALTER TABLE public.user_firm_roles 
    DROP CONSTRAINT IF EXISTS user_firm_roles_user_id_fkey;

ALTER TABLE public.user_firm_roles 
    ADD CONSTRAINT user_firm_roles_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 2. Verify Schema Integrity
-- Ensure all columns requested by the frontend exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_state') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_state TEXT DEFAULT 'pending';
    END IF;
END $$;

-- 3. Diagnostic: Ping Schema Cache
-- This tells the Supabase API to re-scan relationships immediately
COMMENT ON TABLE public.profiles IS 'Unified profile table for staff lookup.';
COMMENT ON TABLE public.user_firm_roles IS 'Firm roles with explicit profile joins.';

SELECT '✅ Staff fetch relationship fixed. Please refresh your browser.' AS status;
