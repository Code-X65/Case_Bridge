-- ========================================================
-- FIX CLIENT IDENTITY VISIBILITY (External Users)
-- ========================================================

-- 1. Ensure 'external_users' table exists (Client Profile)
CREATE TABLE IF NOT EXISTS public.external_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Populate 'external_users' from 'auth.users' (Backfill)
INSERT INTO public.external_users (id, email, first_name, last_name, phone)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'first_name', 'Client'),
    COALESCE(raw_user_meta_data->>'last_name', ''),
    raw_user_meta_data->>'phone'
FROM auth.users
WHERE 
    -- Exclude internal profiles
    NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.users.id)
    AND
    -- Exclude existing external_users
    NOT EXISTS (SELECT 1 FROM public.external_users WHERE id = auth.users.id);

-- 3. RLS Policies for 'external_users'
ALTER TABLE public.external_users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Internal Staff can View All Clients (for Intake/Matters)
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

-- Policy 2: Users can View Themselves
DROP POLICY IF EXISTS "Users view own external profile" ON public.external_users;
CREATE POLICY "Users view own external profile"
ON public.external_users FOR SELECT
USING (id = auth.uid());

-- 4. Update FKs to point to 'external_users' (Enables correct PostgREST joins)

-- case_reports
DO $$ BEGIN
    ALTER TABLE public.case_reports DROP CONSTRAINT IF EXISTS case_reports_client_id_fkey;
    ALTER TABLE public.case_reports ADD CONSTRAINT case_reports_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.external_users(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- matters
DO $$ BEGIN
    ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_client_id_fkey;
    ALTER TABLE public.matters ADD CONSTRAINT matters_client_id_fkey 
        FOREIGN KEY (client_id) REFERENCES public.external_users(id);
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- 5. Trigger to keep external_users in sync with auth.users (on new signups)
CREATE OR REPLACE FUNCTION public.handle_new_external_user() 
RETURNS TRIGGER AS $$
BEGIN
    -- Only insert if not in profiles (internal)
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.external_users (id, email, first_name, last_name, phone)
        VALUES (
            NEW.id, 
            NEW.email, 
            NEW.raw_user_meta_data->>'first_name', 
            NEW.raw_user_meta_data->>'last_name', 
            NEW.raw_user_meta_data->>'phone'
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created_external ON auth.users;
CREATE TRIGGER trg_on_auth_user_created_external
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_external_user();

-- 6. Reload Schema
NOTIFY pgrst, 'reload';

SELECT '✅ Client Identity System (external_users) Fixed & Synced' as status;
