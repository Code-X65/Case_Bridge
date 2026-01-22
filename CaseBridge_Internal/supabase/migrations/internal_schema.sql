-- ============================================================
-- CASEBRIDGE INTERNAL PLATFORM — DATABASE SCHEMA
-- ============================================================
-- This extends the existing client schema with internal-only tables
-- MUST be run AFTER the client schema is in place
-- ============================================================

-- ============================================================
-- 1. EXTEND PROFILES TABLE FOR INTERNAL USERS
-- ============================================================

-- Add firm_id and internal role columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS firm_id UUID,
ADD COLUMN IF NOT EXISTS internal_role TEXT CHECK (internal_role IN ('admin_manager', 'case_manager', 'associate_lawyer')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated'));

-- Create firms table
CREATE TABLE IF NOT EXISTS public.firms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_firm 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- Enable RLS for firms
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view their firm" ON public.firms;
CREATE POLICY "Firm members can view their firm"
ON public.firms FOR SELECT
USING (id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admin managers can update their firm" ON public.firms;
CREATE POLICY "Admin managers can update their firm"
ON public.firms FOR UPDATE
USING (
    id IN (
        SELECT firm_id FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role = 'admin_manager'
        AND status = 'active'
    )
);

-- ============================================================
-- 2. INVITATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    internal_role TEXT NOT NULL CHECK (internal_role IN ('admin_manager', 'case_manager', 'associate_lawyer')),
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
    invited_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin managers can create invitations" ON public.invitations;
CREATE POLICY "Admin managers can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (
    firm_id IN (
        SELECT firm_id FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role = 'admin_manager'
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Firm members can view their firm invitations" ON public.invitations;
CREATE POLICY "Firm members can view their firm invitations"
ON public.invitations FOR SELECT
USING (
    firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
);

-- ============================================================
-- 3. CASE ASSIGNMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE NOT NULL,
    associate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(matter_id, associate_id)
);

-- Enable RLS for case_assignments
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Case managers can assign cases" ON public.case_assignments;
CREATE POLICY "Case managers can assign cases"
ON public.case_assignments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Internal users can view assignments" ON public.case_assignments;
CREATE POLICY "Internal users can view assignments"
ON public.case_assignments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

-- ============================================================
-- 4. CASE LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.case_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for case_logs
ALTER TABLE public.case_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can create case logs" ON public.case_logs;
CREATE POLICY "Internal users can create case logs"
ON public.case_logs FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Internal users can view case logs" ON public.case_logs;
CREATE POLICY "Internal users can view case logs"
ON public.case_logs FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

-- ============================================================
-- 5. AUDIT LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    actor_id UUID REFERENCES public.profiles(id),
    target_user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can create audit logs" ON public.audit_logs;
CREATE POLICY "Internal users can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (
    firm_id IN (
        SELECT firm_id FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Admin managers can view audit logs" ON public.audit_logs;
CREATE POLICY "Admin managers can view audit logs"
ON public.audit_logs FOR SELECT
USING (
    firm_id IN (
        SELECT firm_id FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role = 'admin_manager'
        AND status = 'active'
    )
);

-- ============================================================
-- 6. NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    payload JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Internal users can create notifications" ON public.notifications;
CREATE POLICY "Internal users can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (
    firm_id IN (
        SELECT firm_id FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

-- ============================================================
-- 7. UPDATE MATTERS TABLE FOR INTERNAL USE
-- ============================================================

-- Add firm_id to matters for firm isolation
ALTER TABLE public.matters 
ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES public.firms(id);

-- Update RLS policies for matters to include firm isolation
DROP POLICY IF EXISTS "Internal users can view firm matters" ON public.matters;
CREATE POLICY "Internal users can view firm matters"
ON public.matters FOR SELECT
USING (
    firm_id IN (
        SELECT firm_id FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Case managers can update matters" ON public.matters;
CREATE POLICY "Case managers can update matters"
ON public.matters FOR UPDATE
USING (
    firm_id IN (
        SELECT firm_id FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
);

-- ============================================================
-- 8. HELPER FUNCTIONS
-- ============================================================

-- Function to check if user is admin manager
CREATE OR REPLACE FUNCTION is_admin_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role = 'admin_manager'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is case manager
CREATE OR REPLACE FUNCTION is_case_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role IN ('admin_manager', 'case_manager')
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's firm_id
CREATE OR REPLACE FUNCTION get_user_firm_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT firm_id FROM public.profiles
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- SCHEMA REFRESH
-- ============================================================

NOTIFY pgrst, 'reload schema';
