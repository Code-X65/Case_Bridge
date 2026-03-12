-- ==========================================
-- HARDEN RELATIONSHIPS FOR POSTGREST JOINS
-- ==========================================

-- 1. Ensure foreign keys on matters table for joined selects
DO $$ 
BEGIN 
    -- Link to external_users (Clients)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matters_client_id_fkey_v2') THEN
        ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_client_id_fkey;
        ALTER TABLE public.matters ADD CONSTRAINT matters_client_id_fkey_v2 
            FOREIGN KEY (client_id) REFERENCES public.external_users(id) ON DELETE SET NULL;
    END IF;

    -- Link to profiles (Assignee/Associate)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matters_assigned_associate_fkey') THEN
        ALTER TABLE public.matters ADD CONSTRAINT matters_assigned_associate_fkey 
            FOREIGN KEY (assigned_associate) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Link to profiles (Case Manager)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matters_assigned_case_manager_fkey') THEN
        ALTER TABLE public.matters ADD CONSTRAINT matters_assigned_case_manager_fkey 
            FOREIGN KEY (assigned_case_manager) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- Link to case_reports
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'matters_case_report_id_fkey') THEN
        ALTER TABLE public.matters ADD CONSTRAINT matters_case_report_id_fkey 
            FOREIGN KEY (case_report_id) REFERENCES public.case_reports(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT '✅ Database relationships hardened' AS status;
