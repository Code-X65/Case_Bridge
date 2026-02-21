-- ==========================================
-- SETTINGS & SECURITY INFRASTRUCTURE
-- Adds missing columns for firm branding and security policies
-- ==========================================

DO $$
BEGIN
    -- Branding & Details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'website') THEN
        ALTER TABLE public.firms ADD COLUMN website TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'logo_url') THEN
        ALTER TABLE public.firms ADD COLUMN logo_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'tax_id') THEN
        ALTER TABLE public.firms ADD COLUMN tax_id TEXT;
    END IF;

    -- Security Policies
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'enforce_2fa') THEN
        ALTER TABLE public.firms ADD COLUMN enforce_2fa BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'whitelist_ips') THEN
        ALTER TABLE public.firms ADD COLUMN whitelist_ips TEXT[] DEFAULT '{}';
    END IF;

    -- Operational Defaults
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'session_idle_timeout') THEN
        ALTER TABLE public.firms ADD COLUMN session_idle_timeout INTEGER DEFAULT 1440;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'matter_numbering_prefix') THEN
        ALTER TABLE public.firms ADD COLUMN matter_numbering_prefix TEXT DEFAULT 'CB-';
    END IF;

    -- Meta
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'updated_at') THEN
        ALTER TABLE public.firms ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_firm_updated_at ON public.firms;
CREATE TRIGGER set_firm_updated_at
    BEFORE UPDATE ON public.firms
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Comment on columns for clarification
COMMENT ON COLUMN public.firms.tax_id IS 'Legal registration number (VAT/TIN/etc) of the firm';
COMMENT ON COLUMN public.firms.enforce_2fa IS 'If true, all firm users must have MFA enabled to access internal features';

NOTIFY pgrst, 'reload schema';

SELECT '✅ SETTINGS INFRASTRUCTURE APPLIED' as status;
