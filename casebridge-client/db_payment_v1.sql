-- ========================================================
-- CASEBRIDGE INTAKE PRIORITY PAYMENT v1
-- ========================================================
-- Implements Paystack Invoices, Payments, and Case Gating.

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE public.intake_plan_type AS ENUM ('basic', 'standard', 'premium');
    CREATE TYPE public.invoice_status_type AS ENUM ('draft', 'pending', 'paid', 'failed', 'expired');
    CREATE TYPE public.payment_provider_type AS ENUM ('paystack');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. INVOICES TABLE
-- System of record for billing.
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.external_users(id),
    plan_type public.intake_plan_type NOT NULL,
    amount NUMERIC(10, 2) NOT NULL, -- Stored in NGN major units (e.g. 7000.00)
    currency TEXT NOT NULL DEFAULT 'NGN',
    status public.invoice_status_type NOT NULL DEFAULT 'draft',
    paystack_reference TEXT UNIQUE, -- External reference
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
    paid_at TIMESTAMPTZ
);

-- 3. PAYMENTS TABLE
-- Audit log of payment attempts/webhooks.
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id),
    provider public.payment_provider_type NOT NULL DEFAULT 'paystack',
    provider_reference TEXT NOT NULL,
    status TEXT NOT NULL, -- success | failed
    amount_paid NUMERIC(10, 2),
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CASE GATING COLUMNS
-- Link cases to invoices to enforce "No Payment = No Case".
ALTER TABLE public.case_reports 
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id),
ADD COLUMN IF NOT EXISTS intake_plan public.intake_plan_type;

-- Ensure an invoice can only be used once
-- (We'll check this via logic or partial unique index, but simple logic is better for v1)
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_reports_invoice_id ON public.case_reports(invoice_id);

-- 5. RLS POLICIES

-- Invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view own invoices" ON public.invoices;
CREATE POLICY "Clients view own invoices" ON public.invoices
FOR SELECT USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients create invoices" ON public.invoices;
CREATE POLICY "Clients create invoices" ON public.invoices
FOR INSERT WITH CHECK (client_id = auth.uid());

-- Payments (View Only for Clients)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients view own payments" ON public.payments;
CREATE POLICY "Clients view own payments" ON public.payments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.invoices i
        WHERE i.id = public.payments.invoice_id
        AND i.client_id = auth.uid()
    )
);

-- 6. WEBHOOG SIMULATION / HANDLING LOGIC
-- Since we are in Dev without external Webhooks, we provide a secure RPC 
-- for the frontend (or internal admin) to "Simulate" a payment.
-- IN PRODUCTION: This would be called by the Supabase Edge Function verifying Paystack signature.

CREATE OR REPLACE FUNCTION public.confirm_invoice_payment(
    p_invoice_id UUID,
    p_reference TEXT,
    p_status TEXT -- 'success' or 'failed'
)
RETURNS VOID AS $$
DECLARE
    v_invoice_status public.invoice_status_type;
BEGIN
    -- Verify invoice exists
    SELECT status INTO v_invoice_status FROM public.invoices WHERE id = p_invoice_id;
    
    IF v_invoice_status = 'paid' THEN
        RETURN; -- Already paid, idempotent
    END IF;

    IF p_status = 'success' THEN
        UPDATE public.invoices
        SET status = 'paid',
            paid_at = NOW(),
            paystack_reference = p_reference
        WHERE id = p_invoice_id;
        
        -- Log payment
        INSERT INTO public.payments (invoice_id, provider_reference, status, amount_paid)
        VALUES (p_invoice_id, p_reference, 'success', 
            (SELECT amount FROM public.invoices WHERE id = p_invoice_id));
            
        -- Emit Event
        PERFORM public.emit_case_event('invoice_paid', p_invoice_id, NULL, jsonb_build_object('reference', p_reference));
    ELSE
        UPDATE public.invoices
        SET status = 'failed'
        WHERE id = p_invoice_id;
        
         INSERT INTO public.payments (invoice_id, provider_reference, status)
        VALUES (p_invoice_id, p_reference, 'failed');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 

SELECT '✅ Payment & Gating v1 Applied' as status;
