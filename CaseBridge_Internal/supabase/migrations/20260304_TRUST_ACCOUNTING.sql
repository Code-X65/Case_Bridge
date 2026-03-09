-- ==========================================
-- PHASE 3: IOLTA TRUST ACCOUNTING
-- ==========================================

-- 1. Trust Ledger Entries
-- Physically separate from general operating expenses
CREATE TABLE IF NOT EXISTS public.trust_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID REFERENCES public.matters(id) ON DELETE RESTRICT,
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL, -- Negative for disbursements, Positive for deposits
    entry_type TEXT CHECK (entry_type IN ('deposit', 'disbursement', 'transfer', 'adjustment')),
    description TEXT NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    reference_number TEXT, -- Check # or Wire ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

-- 2. Prevent Trust Over-Drafting (Matter Level)
-- Ensures a firm never spends more of a client's money than is in their specific trust bucket.
CREATE OR REPLACE FUNCTION public.check_trust_balance()
RETURNS TRIGGER AS $$
DECLARE
    current_balance DECIMAL(15, 2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO current_balance
    FROM public.trust_ledger_entries
    WHERE matter_id = NEW.matter_id;

    IF (current_balance + NEW.amount) < 0 THEN
        RAISE EXCEPTION 'Insufficient Trust Funds: Matter balance is %, requested disbursement of %', current_balance, ABS(NEW.amount);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ensure_trust_solvency ON public.trust_ledger_entries;
CREATE TRIGGER trg_ensure_trust_solvency
BEFORE INSERT ON public.trust_ledger_entries
FOR EACH ROW
WHEN (NEW.amount < 0)
EXECUTE FUNCTION public.check_trust_balance();

-- 3. Three-Way Reconciliation View
-- Compares Individual Matter Balances vs Total Trust Ledger
CREATE OR REPLACE VIEW public.trust_reconciliation_report AS
SELECT 
    m.firm_id,
    m.id as matter_id,
    m.title as matter_title,
    eu.first_name || ' ' || eu.last_name as client_name,
    COALESCE(SUM(tle.amount), 0) as trust_balance
FROM public.matters m
JOIN public.external_users eu ON m.client_id = eu.id
LEFT JOIN public.trust_ledger_entries tle ON m.id = tle.matter_id
GROUP BY m.firm_id, m.id, m.title, eu.first_name, eu.last_name;

-- 4. RLS Policies
ALTER TABLE public.trust_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_access_trust_ledger" ON public.trust_ledger_entries;
CREATE POLICY "firm_access_trust_ledger" ON public.trust_ledger_entries
FOR ALL TO authenticated USING (
    firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
);

SELECT '✅ IOLTA Trust Accounting Schema Initialized.' AS status;
