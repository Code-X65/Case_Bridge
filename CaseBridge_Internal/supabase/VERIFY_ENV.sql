-- VERIFY ENVIRONMENT AND RPC BEHAVIOR
DO $$
BEGIN
    -- Check http extension
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN
        RAISE NOTICE '❌ http extension is NOT installed';
    ELSE
        RAISE NOTICE '✅ http extension is installed';
    END IF;

    -- Check is_staff function
    IF NOT EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'is_staff' AND nspname = 'public') THEN
        RAISE NOTICE '❌ public.is_staff() NOT found';
    ELSE
        RAISE NOTICE '✅ public.is_staff() found';
    END IF;
END $$;

-- Check current settings
SELECT 
    current_setting('app.settings.service_role_key', true) as service_key_set,
    current_setting('app.settings.supabase_url', true) as url_set;
