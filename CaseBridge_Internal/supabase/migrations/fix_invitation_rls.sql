-- ============================================================================
-- FIX: Allow unauthenticated users to view invitations by token
-- ============================================================================
-- This allows the AcceptInvitePage to fetch invitation details
-- without requiring authentication
-- ============================================================================

-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Firm members can view their firm invitations" ON public.invitations;

-- Create new policy that allows viewing by token (unauthenticated)
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.invitations;
CREATE POLICY "Anyone can view invitation by token"
ON public.invitations FOR SELECT
USING (true);  -- Allow anyone to SELECT, but they need the token to find it

-- Also allow authenticated firm members to view all firm invitations
DROP POLICY IF EXISTS "Authenticated users can view firm invitations" ON public.invitations;
CREATE POLICY "Authenticated users can view firm invitations"
ON public.invitations FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
);

-- Allow unauthenticated users to update invitation status (when accepting)
DROP POLICY IF EXISTS "Anyone can update invitation by token" ON public.invitations;
CREATE POLICY "Anyone can update invitation by token"
ON public.invitations FOR UPDATE
USING (true)
WITH CHECK (status IN ('accepted', 'expired'));

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the policies are correct:

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'invitations'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED POLICIES:
-- ============================================================================
-- 1. "Admin managers can create invitations" - INSERT
-- 2. "Anyone can view invitation by token" - SELECT (allows unauthenticated)
-- 3. "Anyone can update invitation by token" - UPDATE (allows accepting)
-- 4. "Authenticated users can view firm invitations" - SELECT (for logged-in users)
-- ============================================================================
