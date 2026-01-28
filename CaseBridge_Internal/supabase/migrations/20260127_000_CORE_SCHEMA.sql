-- ==========================================
-- CORE SCHEMA: INITIAL TABLES & STRUCTURE
-- ==========================================

-- 1. FIRMS TABLE
CREATE TABLE IF NOT EXISTS public.firms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'locked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROFILES TABLE (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin_manager', 'case_manager', 'associate_lawyer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'locked')),
    onboarding_state TEXT DEFAULT 'pending' CHECK (onboarding_state IN ('pending', 'completed')),
    first_login_flag BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USER FIRM ROLES (Multi-tenancy mapping)
CREATE TABLE IF NOT EXISTS public.user_firm_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (LOWER(role) IN ('admin_manager', 'case_manager', 'associate_lawyer')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'locked')),
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, firm_id)
);

-- 4. INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role_preassigned TEXT NOT NULL CHECK (LOWER(role_preassigned) IN ('admin_manager', 'case_manager', 'associate_lawyer')),
    token UUID DEFAULT gen_random_uuid() UNIQUE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    invited_by UUID REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    user_id UUID REFERENCES auth.users(id), -- User ID after acceptance
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INTERNAL SESSIONS (Firm-scoped sessions)
CREATE TABLE IF NOT EXISTS public.internal_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PENDING FIRM REGISTRATIONS (Bridge for registration flow)
CREATE TABLE IF NOT EXISTS public.pending_firm_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID, -- References auth.users(id) but might be created before session
    firm_name TEXT NOT NULL,
    firm_email TEXT,
    firm_phone TEXT,
    firm_address TEXT,
    user_first_name TEXT,
    user_last_name TEXT,
    user_phone TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Check if a user is an admin for a specific firm
CREATE OR REPLACE FUNCTION public.is_firm_admin(target_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND firm_id = target_firm_id
        AND LOWER(role) = 'admin_manager'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- BASIC RLS (Enable all)
-- ==========================================
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_firm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_firm_registrations DISABLE ROW LEVEL SECURITY; -- Public for registration

-- Simple Policies
DROP POLICY IF EXISTS "Users can view their own firm" ON public.firms;
CREATE POLICY "Users can view their own firm" ON public.firms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_firm_roles 
            WHERE user_id = auth.uid() AND firm_id = public.firms.id
        )
    );

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can manage firm roles" ON public.user_firm_roles;
CREATE POLICY "Admins can manage firm roles" ON public.user_firm_roles
    FOR ALL USING (public.is_firm_admin(firm_id));

SELECT '✅ Core Schema Applied Successfully.' AS status;
