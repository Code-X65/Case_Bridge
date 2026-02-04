-- ==========================================
-- INTERNAL LEGAL NOTES
-- ==========================================

-- Add internal_notes column to matters table
ALTER TABLE public.matters 
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

COMMENT ON COLUMN public.matters.internal_notes IS 'Rich-text internal legal notes for the matter. Not visible to clients.';

SELECT '✅ Internal Notes column added to Matters.' AS status;
