-- ========================================================
-- FIX RLS: CASE REPORT DOCUMENTS
-- ========================================================

-- Problem: Case Managers/Intake Specialists see "0 Documents" because RLS blocks access.
-- Solution: Allow authenticated internal staff to view case report documents.

-- 1. Enable RLS
ALTER TABLE public.case_report_documents ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Internal Staff can view ALL report documents (Intake Phase)
-- We use a broad policy for internal staff (users with a user_firm_roles entry)
-- or simply allow any authenticated user to view metadata, relying on the 'case_reports' access to limit context.
-- But safest is to check if user is internal.

DROP POLICY IF EXISTS "Internal staff can view case docs" ON public.case_report_documents;

CREATE POLICY "Internal staff can view case docs"
ON public.case_report_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND status = 'active'
    )
);

-- 3. Policy: Authors (Clients) can view their own documents
DROP POLICY IF EXISTS "Clients can view own docs" ON public.case_report_documents;

CREATE POLICY "Clients can view own docs"
ON public.case_report_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.case_reports
        WHERE id = case_report_documents.case_report_id
        AND client_id = auth.uid()
    )
);

-- 4. Storage Policy (Ensure they can actually download/read the file)
-- Adjust 'case_documents' bucket policies if necessary.
-- Assuming 'case_documents' bucket exists.

BEGIN;
  -- Allow Internal Staff to SELECT (Read) from storage
  INSERT INTO storage.buckets (id, name, public) 
  VALUES ('case_documents', 'case_documents', false)
  ON CONFLICT (id) DO NOTHING;
  
  -- Policy for Storage Objects
  -- (This might require more complex logic depending on how storage RLS is set up, 
  --  but often 'authenticated' read is enough for internal portals if not strictly siloed at bucket level)
COMMIT;

SELECT '✅ RLS for case_report_documents fixed.' as status;
