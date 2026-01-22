-- Case Manager Refinements Migration

-- 1. Create Case Statements table (Flow 8A)
CREATE TABLE IF NOT EXISTS public.case_statements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for case_statements
ALTER TABLE public.case_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Internal users can view case statements" ON public.case_statements;
CREATE POLICY "Internal users can view case statements"
ON public.case_statements FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Case managers can manage case statements" ON public.case_statements;
CREATE POLICY "Case managers can manage case statements"
ON public.case_statements FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
);

-- 2. Update Invitations table and policies (Flow 6A)
-- First, drop the old constraint to allow 'client'
ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_internal_role_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_internal_role_check 
CHECK (internal_role IN ('admin_manager', 'case_manager', 'associate_lawyer', 'client'));

-- Update RLS to allow Case Managers to invite Associate Lawyers and Clients
DROP POLICY IF EXISTS "Admin managers can create invitations" ON public.invitations;
CREATE POLICY "Managers can create invitations"
ON public.invitations FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IN ('admin_manager', 'case_manager')
        AND status = 'active'
    )
    AND (
        -- Admin managers can invite anyone
        (SELECT internal_role FROM public.profiles WHERE id = auth.uid()) = 'admin_manager'
        OR
        -- Case managers can ONLY invite associates and clients
        (
            (SELECT internal_role FROM public.profiles WHERE id = auth.uid()) = 'case_manager'
            AND internal_role IN ('associate_lawyer', 'client')
        )
    )
);

-- 3. Billing Visibility (Flow 11A)
-- Ensure Internal Users can view invoices and payments (Read-only for Case Manager by UI)
DROP POLICY IF EXISTS "Internal users can view invoices" ON public.invoices;
CREATE POLICY "Internal users can view invoices"
ON public.invoices FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Internal users can view payments" ON public.payments;
CREATE POLICY "Internal users can view payments"
ON public.payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND internal_role IS NOT NULL
        AND status = 'active'
    )
);

NOTIFY pgrst, 'reload schema';
