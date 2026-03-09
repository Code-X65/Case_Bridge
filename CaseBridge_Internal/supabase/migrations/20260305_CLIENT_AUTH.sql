-- ==========================================
-- CLIENT AUTHENTICATION ENHANCEMENTS
-- ==========================================

-- 1. AUTO-CREATE CLIENT PROFILE FOR OAUTH SIGNUP
-- If a user signs up via Google (or any provider) and they don't have a profile,
-- we'll attempt to link them if they exist in matters or documents by email.
CREATE OR REPLACE FUNCTION public.handle_new_client_oauth()
RETURNS TRIGGER AS $$
DECLARE
    v_firm_id UUID;
    v_full_name TEXT;
BEGIN
    -- Only proceed if this is a new auth user and NOT an internal staff (no entry in profiles)
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        RETURN NEW;
    END IF;

    -- Check if this email is already linked to a firm via 'matters' or 'external_users'
    SELECT firm_id INTO v_firm_id
    FROM public.matters
    WHERE client_id IS NULL AND (raw_client_data->>'email' = NEW.email OR EXISTS (SELECT 1 FROM public.external_users WHERE email = NEW.email AND id = NEW.id))
    LIMIT 1;

    -- Fallback: If no direct matter link, check if we have a firm-specific invitation or existing record
    -- For now, we'll use a placeholder firm if not found, or they enter an onboarding state.
    -- v_firm_id := COALESCE(v_firm_id, ...); 

    IF v_firm_id IS NOT NULL THEN
        v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New Client');
        
        INSERT INTO public.client_profiles (id, firm_id, full_name, email)
        VALUES (NEW.id, v_firm_id, v_full_name, NEW.email)
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users (matches existing internal profile triggers)
DROP TRIGGER IF EXISTS trg_on_auth_user_created_client ON auth.users;
CREATE TRIGGER trg_on_auth_user_created_client
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_client_oauth();

-- 2. IMPROVE CLIENT RLS POLICIES FOR FIRM ISOLATION
-- Ensure clients are properly isolated by firm_id within their own profiles too
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view own profile" ON public.client_profiles;
CREATE POLICY "Clients view own profile" ON public.client_profiles
FOR SELECT USING (id = auth.uid());

SELECT '✅ Client Auth triggers and RLS deployed.' as status;
