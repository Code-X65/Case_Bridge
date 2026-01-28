-- ========================================================
-- SCHEMA NORMALIZATION: Matters Table
-- ========================================================

DO $$ 
BEGIN
    -- 1. Rename assigned_attorney_id to assigned_associate if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_attorney_id') THEN
        ALTER TABLE public.matters RENAME COLUMN assigned_attorney_id TO assigned_associate;
    END IF;

    -- 2. Add assigned_associate if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_associate') THEN
        ALTER TABLE public.matters ADD COLUMN assigned_associate UUID REFERENCES public.profiles(id);
    END IF;

    -- 3. Add assigned_case_manager if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='assigned_case_manager') THEN
        ALTER TABLE public.matters ADD COLUMN assigned_case_manager UUID REFERENCES public.profiles(id);
    END IF;

    -- 4. Ensure lifecycle_state exists (from db_lifecycle_v1.sql)
    -- This depends on the matter_lifecycle_state type existing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='lifecycle_state') THEN
        ALTER TABLE public.matters ADD COLUMN lifecycle_state public.matter_lifecycle_state DEFAULT 'submitted';
    END IF;
END $$;

SELECT '✅ Matters schema normalized.' as status;
