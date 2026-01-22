-- ============================================================================
-- FIX: Allow internal users to view profiles associated with their firm
-- ============================================================================
-- 1. Internal users should be able to view profiles that share their firm_id
-- 2. Internal users should be able to view profiles of clients who have matters in their firm
-- ============================================================================

-- First, ensure the policy to view same-firm profiles is robust
DROP POLICY IF EXISTS "Internal users can view firm profiles" ON public.profiles;
CREATE POLICY "Internal users can view firm profiles"
ON public.profiles FOR SELECT
USING (
    firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid()) OR
    id IN (
        SELECT client_id FROM public.matters 
        WHERE firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- Note: The second part of the OR allows visibility even if the client profile
-- doesn't have a firm_id set yet, as long as they have a matter tied to the firm.

-- Also allow Admin Managers to see ALL profiles? 
-- No, that's not safe. Stick to firm isolation.

NOTIFY pgrst, 'reload schema';
