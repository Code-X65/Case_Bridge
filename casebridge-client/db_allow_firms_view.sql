-- ========================================================
-- RLS UPDATE: ALLOW CLIENTS TO VIEW FIRMS
-- ========================================================

-- Users (Clients & Staff) need to see the list of active firms to select a "Preferred Firm".
-- The existing policy only allows staff to see their OWN firm.
-- We add a policy to allow ANY authenticated user (including Clients) to view ACTIVE firms.

CREATE POLICY "Allow basic viewing of active firms"
ON public.firms FOR SELECT
USING (status = 'active');

-- Verify
SELECT '✅ RLS Policy added to allow viewing active firms' as status;
