-- Add missing adverse_parties columns to support conflict search engine
-- We add it to both case_reports (intake) and matters (workspace)

ALTER TABLE public.case_reports ADD COLUMN IF NOT EXISTS adverse_parties TEXT;
ALTER TABLE public.matters ADD COLUMN IF NOT EXISTS adverse_parties TEXT;

-- Refresh the search_conflicts function just in case (though the columns being added should fix the reference error)
-- No changes needed to the function logic, it just needs the columns to exist.

-- Trigger for sync: When accepting a case report, ensure adverse_parties is copied to matter if created manually elsewhere 
-- However, IntakeReview.tsx handles the insertion into matters.

SELECT '✅ Missing adverse_parties columns added to matters and case_reports' AS status;
