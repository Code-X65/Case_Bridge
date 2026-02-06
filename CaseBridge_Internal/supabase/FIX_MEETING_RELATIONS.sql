-- FIX CASE MEETINGS RELATIONSHIPS
-- PostgREST requires explicit Foreign Key constraints to perform joins.

DO $$
BEGIN
    -- 1. Fix case_id -> matters relationship
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_meetings' AND column_name = 'case_id') THEN
        -- Drop if exists to avoid duplicates
        ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_case_id_fkey;
        -- Add the formal reference
        ALTER TABLE public.case_meetings 
            ADD CONSTRAINT case_meetings_case_id_fkey 
            FOREIGN KEY (case_id) 
            REFERENCES public.matters(id) 
            ON DELETE CASCADE;
    END IF;

    -- 2. Fix client_id -> external_users relationship
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_meetings' AND column_name = 'client_id') THEN
        ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_client_id_fkey;
        ALTER TABLE public.case_meetings 
            ADD CONSTRAINT case_meetings_client_id_fkey 
            FOREIGN KEY (client_id) 
            REFERENCES public.external_users(id) 
            ON DELETE SET NULL;
    END IF;

    -- 3. Fix lawyer_user_id -> profiles relationship
    -- Joining to public.profiles is better than auth.users for PostgREST discoverability
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_meetings' AND column_name = 'lawyer_user_id') THEN
        ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_lawyer_id_fkey;
        ALTER TABLE public.case_meetings 
            ADD CONSTRAINT case_meetings_lawyer_id_fkey 
            FOREIGN KEY (lawyer_user_id) 
            REFERENCES public.profiles(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';

SELECT '✅ Case Meeting Relationships Fixed' as status;
