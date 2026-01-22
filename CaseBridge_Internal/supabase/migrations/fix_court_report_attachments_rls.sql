-- ============================================================================
-- FIX: Court Report Attachments RLS Policy
-- ============================================================================
-- This fixes the INSERT policy to properly reference the values being inserted
-- ============================================================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Lawyers can upload report attachments" ON public.court_report_attachments;

-- Create corrected policy
-- The issue was that the policy was referencing court_report_attachments.court_report_id
-- which doesn't exist yet during INSERT. We need to reference the NEW row being inserted.
CREATE POLICY "Lawyers can upload report attachments"
ON public.court_report_attachments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.court_reports cr
        WHERE cr.id = court_report_id  -- This references the column being inserted
        AND cr.associate_id = auth.uid()
    )
);

-- Alternatively, we can make it simpler by just checking if the user is an associate lawyer
-- and let the application logic handle the rest
DROP POLICY IF EXISTS "Lawyers can upload report attachments" ON public.court_report_attachments;

CREATE POLICY "Lawyers can upload report attachments"
ON public.court_report_attachments FOR INSERT
WITH CHECK (
    -- Check if user is an associate lawyer
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role = 'associate_lawyer'
        AND status = 'active'
    )
    AND
    -- Check if the court report exists and belongs to this user
    EXISTS (
        SELECT 1 FROM public.court_reports cr
        WHERE cr.id = court_report_id
        AND cr.associate_id = auth.uid()
    )
);

-- Refresh schema
NOTIFY pgrst, 'reload schema';
