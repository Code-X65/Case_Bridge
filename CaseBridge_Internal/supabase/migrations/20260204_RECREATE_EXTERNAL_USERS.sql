-- ========================================================
-- RECREATE EXTERNAL_USERS TABLE
-- ========================================================
-- This script recreates the external_users table that was accidentally deleted
-- It includes the table structure, RLS policies, triggers, and backfill logic

-- 1. Create external_users table
CREATE TABLE IF NOT EXISTS public.external_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    country TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_users_email ON public.external_users(email);
CREATE INDEX IF NOT EXISTS idx_external_users_status ON public.external_users(status);

-- 3. Backfill external_users from auth.users
-- This populates the table with existing client data
INSERT INTO public.external_users (id, email, first_name, last_name, phone, country)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'first_name', 'Client'),
    COALESCE(raw_user_meta_data->>'last_name', ''),
    raw_user_meta_data->>'phone',
    raw_user_meta_data->>'country'
FROM auth.users
WHERE 
    -- Exclude internal staff (they have profiles)
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.users.id)
    AND
    -- Exclude already existing external_users
    NOT EXISTS (SELECT 1 FROM public.external_users WHERE id = auth.users.id)
ON CONFLICT (id) DO NOTHING;

-- 4. Enable Row Level Security
ALTER TABLE public.external_users ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Policy 1: Internal staff can view all external users (for case management)
DROP POLICY IF EXISTS "Internal staff view external users" ON public.external_users;
CREATE POLICY "Internal staff view external users"
ON public.external_users FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);

-- Policy 2: Users can view their own profile
DROP POLICY IF EXISTS "Users view own external profile" ON public.external_users;
CREATE POLICY "Users view own external profile"
ON public.external_users FOR SELECT
USING (id = auth.uid());

-- Policy 3: Users can update their own profile
DROP POLICY IF EXISTS "Users update own external profile" ON public.external_users;
CREATE POLICY "Users update own external profile"
ON public.external_users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 6. Create trigger to auto-sync new external users from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_external_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if not an internal user (not in profiles table)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.external_users (id, email, first_name, last_name, phone, country)
        VALUES (
            NEW.id, 
            NEW.email, 
            NEW.raw_user_meta_data->>'first_name', 
            NEW.raw_user_meta_data->>'last_name', 
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'country'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone,
            country = EXCLUDED.country,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_on_auth_user_created_external ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER trg_on_auth_user_created_external
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_external_user();

-- 7. Restore foreign key constraints on dependent tables

-- Fix case_reports FK
DO $$ BEGIN
    ALTER TABLE public.case_reports DROP CONSTRAINT IF EXISTS case_reports_client_id_fkey;
    ALTER TABLE public.case_reports ADD CONSTRAINT case_reports_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.external_users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Fix matters FK
DO $$ BEGIN
    ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_client_id_fkey;
    ALTER TABLE public.matters ADD CONSTRAINT matters_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.external_users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Fix case_meetings FK
DO $$ BEGIN
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_client_id_fkey;
    ALTER TABLE public.case_meetings ADD CONSTRAINT case_meetings_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.external_users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- Fix client_documents FK
DO $$ BEGIN
    ALTER TABLE public.client_documents DROP CONSTRAINT IF EXISTS client_documents_client_id_fkey;
    ALTER TABLE public.client_documents ADD CONSTRAINT client_documents_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.external_users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT '✅ external_users table successfully recreated with all dependencies' as status;
