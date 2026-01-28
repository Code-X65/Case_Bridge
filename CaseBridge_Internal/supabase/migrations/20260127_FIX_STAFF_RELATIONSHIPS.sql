-- ==========================================
-- UNIVERSAL RELATIONSHIP FIX: STAFF JOIN
-- ==========================================

-- 1. DROP the ambiguous foreign key
ALTER TABLE public.user_firm_roles 
    DROP CONSTRAINT IF EXISTS user_firm_roles_user_id_fkey;

-- 2. CREATE the explicit join-ready foreign key
-- This MUST point to public.profiles so the API can join them automatically
ALTER TABLE public.user_firm_roles 
    ADD CONSTRAINT user_firm_roles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
    ON DELETE CASCADE;

-- 3. REFRESH SCHEMA CACHE
-- PostgREST needs a "ping" to realize the relationships have changed.
-- Adding a comment or dropping/re-creating a simple view triggers this.
COMMENT ON TABLE public.user_firm_roles IS 'Firm membership roles with explicit profile joins.';

-- 4. ENSURE ALL COLUMNS ARE PRESENT
-- The query asks for: full_name, email, onboarding_state
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_state') THEN
        ALTER TABLE public.profiles ADD COLUMN onboarding_state TEXT DEFAULT 'pending';
    END IF;
END $$;

SELECT '✅ Staff relationships fixed. Please refresh your browser.' AS status;
