-- ==========================================
-- FIRM SECURITY & GOVERNANCE SETTINGS
-- ==========================================

-- Add columns to firms table
ALTER TABLE public.firms 
ADD COLUMN IF NOT EXISTS enforce_2fa BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whitelist_ips TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS session_idle_timeout INTEGER DEFAULT 1440, -- In minutes
ADD COLUMN IF NOT EXISTS matter_numbering_prefix TEXT DEFAULT 'CB-';

-- Add column for custom categories (per-firm)
-- Previously matters used a global enum or check, but firm-specific categories are better.
-- We might need a separate table for categories if they grow complex, but for now a text array is fine.
ALTER TABLE public.firms
ADD COLUMN IF NOT EXISTS custom_matter_categories TEXT[] DEFAULT '{"Litigation", "Corporate", "Estate", "Intellectual Property", "Criminal"}';

COMMENT ON COLUMN public.firms.enforce_2fa IS 'If true, all staff in this firm MUST have 2FA enabled to access sensitive pages.';
COMMENT ON COLUMN public.firms.whitelist_ips IS 'Array of CIDR or IP strings. If not empty, only these IPs can access firm-scoped data.';

SELECT '✅ Firm Security & Governance columns added.' AS status;
