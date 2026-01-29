-- ==========================================================
-- ADD PROFILE FIELDS TO FIRMS TABLE
-- ==========================================================

ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS website TEXT;

SELECT '✅ Firm Schema updated with logo_url and website.' as status;
