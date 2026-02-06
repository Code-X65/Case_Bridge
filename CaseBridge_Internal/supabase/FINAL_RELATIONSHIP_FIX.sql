-- CASEBRIDGE RELATIONSHIP REPAIR SCRIPT
-- This script fixes the missing foreign keys in the case_meetings table
-- which prevents Supabase from performing joins.

DO $$
BEGIN
    -- 1. Ensure the lawyer_user_id column exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_meetings' AND column_name = 'lawyer_user_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN lawyer_user_id UUID;
    END IF;

    -- 2. Drop existing messy constraints to start clean
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_case_id_fkey;
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_matter_id_fkey;
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_client_id_fkey;
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_lawyer_id_fkey;

    -- 3. Add formal Foreign Key constraints
    -- We'll point 'case_id' to 'matters' to match InternalCalendar's expectation
    ALTER TABLE public.case_meetings 
        ADD CONSTRAINT case_meetings_case_id_fkey 
        FOREIGN KEY (case_id) 
        REFERENCES public.matters(id) 
        ON DELETE CASCADE;

    -- Point 'client_id' to 'external_users'
    ALTER TABLE public.case_meetings 
        ADD CONSTRAINT case_meetings_client_id_fkey 
        FOREIGN KEY (client_id) 
        REFERENCES public.external_users(id) 
        ON DELETE SET NULL;

    -- Point 'lawyer_user_id' to 'profiles'
    ALTER TABLE public.case_meetings 
        ADD CONSTRAINT case_meetings_lawyer_id_fkey 
        FOREIGN KEY (lawyer_user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE SET NULL;

END $$;

-- 4. Force PostgREST to refresh its relationship map
NOTIFY pgrst, 'reload schema';

SELECT '✅ RELATIONSHIPS REPAIRED: case_meetings joined to matters/clients' as status;
