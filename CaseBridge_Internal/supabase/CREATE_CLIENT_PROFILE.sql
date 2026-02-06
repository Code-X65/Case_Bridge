-- ==========================================
-- FIX CLIENT_PROFILES - REMOVE NOT NULL CONSTRAINT
-- Then create profiles for all clients
-- ==========================================

-- Step 1: Drop NOT NULL constraint on firm_id (if it exists)
ALTER TABLE public.client_profiles 
ALTER COLUMN firm_id DROP NOT NULL;

-- Step 2: Reload schema
NOTIFY pgrst, 'reload schema';

-- Step 3: Now insert profile for the specific client
INSERT INTO public.client_profiles (id, email)
SELECT 
    'cf37ffc8-1ec6-43ba-b693-4d382b7cdf1b'::uuid,
    (SELECT email FROM auth.users WHERE id = 'cf37ffc8-1ec6-43ba-b693-4d382b7cdf1b')
WHERE NOT EXISTS (
    SELECT 1 FROM public.client_profiles WHERE id = 'cf37ffc8-1ec6-43ba-b693-4d382b7cdf1b'
)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Auto-create profiles for ALL users who don't have one
INSERT INTO public.client_profiles (id, email)
SELECT 
    au.id,
    au.email
FROM auth.users au
LEFT JOIN public.client_profiles cp ON au.id = cp.id
WHERE cp.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 5: Sync with external_users if that table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'external_users') THEN
        -- Copy data from external_users to client_profiles
        INSERT INTO public.client_profiles (id, email, first_name, last_name, phone)
        SELECT 
            eu.id,
            eu.email,
            eu.first_name,
            eu.last_name,
            eu.phone
        FROM public.external_users eu
        LEFT JOIN public.client_profiles cp ON eu.id = cp.id
        WHERE cp.id IS NULL
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            phone = EXCLUDED.phone;
    END IF;
END $$;

-- Step 6: Reload schema again
NOTIFY pgrst, 'reload schema';

-- Step 7: Verify the specific client now has a profile
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.client_profiles WHERE id = 'cf37ffc8-1ec6-43ba-b693-4d382b7cdf1b')
        THEN '✅ Client profile EXISTS - upload should now work'
        ELSE '❌ Client profile STILL MISSING - check auth.users table'
    END as status,
    (SELECT COUNT(*) FROM public.client_profiles) as total_client_profiles,
    (SELECT firm_id FROM public.client_profiles WHERE id = 'cf37ffc8-1ec6-43ba-b693-4d382b7cdf1b') as client_firm_id;
