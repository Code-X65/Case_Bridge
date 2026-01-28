-- ========================================================
-- FIX CASE ASSIGNMENTS SCHEMA (Canonical v1)
-- ========================================================

-- 1. Ensure Table Exists with Correct Columns
CREATE TABLE IF NOT EXISTS public.case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL, -- Generic ID (Matter ID, etc)
    target_type TEXT NOT NULL CHECK (target_type IN ('matter', 'task', 'document')),
    assigned_to_user_id UUID NOT NULL REFERENCES auth.users(id),
    assigned_role TEXT NOT NULL, -- e.g. 'associate_lawyer', 'case_manager'
    firm_id UUID REFERENCES public.firms(id), -- Added for scope
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(target_id, target_type, assigned_to_user_id, assigned_role)
);

-- 2. Add firm_id if missing (safe migration)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='case_assignments' AND column_name='firm_id') THEN
        ALTER TABLE public.case_assignments ADD COLUMN firm_id UUID REFERENCES public.firms(id);
    END IF;
END $$;

-- 3. Ensure RLS is enabled and policies are correct
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow View (Staff of same firm)
DROP POLICY IF EXISTS "Staff can view all case assignments" ON public.case_assignments;
CREATE POLICY "Staff can view all case assignments"
ON public.case_assignments FOR SELECT
USING (
    firm_id IS NULL OR -- Legacy support
    firm_id IN (
        SELECT firm_id FROM public.user_firm_roles 
        WHERE user_id = auth.uid() AND status = 'active'
    )
);

-- Policy: Allow Manage (Case Manager/Admin of same firm)
DROP POLICY IF EXISTS "Case Managers and Admins can manage assignments" ON public.case_assignments;
CREATE POLICY "Case Managers and Admins can manage assignments"
ON public.case_assignments FOR ALL
USING (
    firm_id IN (
        SELECT firm_id FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active' 
        AND role IN ('admin_manager', 'case_manager')
    )
)
WITH CHECK (
    firm_id IN (
        SELECT firm_id FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active' 
        AND role IN ('admin_manager', 'case_manager')
    )
);

-- 4. Reload Schema Cache
NOTIFY pgrst, 'reload';
