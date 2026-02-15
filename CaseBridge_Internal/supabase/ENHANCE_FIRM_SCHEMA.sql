-- ====================================================================
-- 🚨 FIRM SCHEMA ENHANCEMENT: ADD MISSING COLUMNS
-- ====================================================================
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'email') THEN
        ALTER TABLE public.firms ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'phone') THEN
        ALTER TABLE public.firms ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'address') THEN
        ALTER TABLE public.firms ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'website') THEN
        ALTER TABLE public.firms ADD COLUMN website TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'logo_url') THEN
        ALTER TABLE public.firms ADD COLUMN logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'enforce_2fa') THEN
        ALTER TABLE public.firms ADD COLUMN enforce_2fa BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'whitelist_ips') THEN
        ALTER TABLE public.firms ADD COLUMN whitelist_ips TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'session_idle_timeout') THEN
        ALTER TABLE public.firms ADD COLUMN session_idle_timeout INTEGER DEFAULT 1440;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'firms' AND column_name = 'matter_numbering_prefix') THEN
        ALTER TABLE public.firms ADD COLUMN matter_numbering_prefix TEXT DEFAULT 'CB-';
    END IF;
END $$;

DROP POLICY IF EXISTS "Admins can update their own firm" ON public.firms;
CREATE POLICY "Admins can update their own firm" ON public.firms
    FOR UPDATE USING (public.is_firm_admin(id)) WITH CHECK (public.is_firm_admin(id));

SELECT '✅ Firm Schema Enhanced Successfully.' AS status;
