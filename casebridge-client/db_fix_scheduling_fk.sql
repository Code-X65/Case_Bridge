-- Fix FK for lawyer_user_id to point to profiles to allow joining for full_name
-- This resolves the 400 Bad Request when selecting full_name from lawyer_user_id in InternalCalendar
DO $$ 
BEGIN
    -- Drop existing constraint if it refers to auth.users (likely named automatically or explicitly)
    -- We'll try to drop by name 'case_meetings_lawyer_user_id_fkey' if it matches
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'case_meetings_lawyer_user_id_fkey'
        AND table_name = 'case_meetings'
    ) THEN
        ALTER TABLE public.case_meetings DROP CONSTRAINT case_meetings_lawyer_user_id_fkey;
    END IF;

    -- Add new constraint referencing profiles(id)
    ALTER TABLE public.case_meetings
    ADD CONSTRAINT case_meetings_lawyer_user_id_fkey
    FOREIGN KEY (lawyer_user_id) REFERENCES public.profiles(id);

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error updating FK: %', SQLERRM;
END $$;
