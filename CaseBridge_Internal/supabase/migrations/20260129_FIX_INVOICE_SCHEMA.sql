-- ==========================================
-- FIX INVOICE SCHEMA AND AUDIT TRIGGERS
-- ==========================================
-- Adds missing columns to public.invoices to support audit logging and firm attribution.

-- 1. Add firm_id to invoices
ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS firm_id UUID REFERENCES public.firms(id);

-- 2. Add invoice_number to invoices (Optional but expected by triggers)
ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- 3. Fix emit_invoice_paid function to be more resilient
CREATE OR REPLACE FUNCTION public.emit_invoice_paid() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid' THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (
            auth.uid(), 
            COALESCE(NEW.firm_id, (SELECT preferred_firm_id FROM public.case_reports WHERE invoice_id = NEW.id LIMIT 1)),
            'invoice_paid',
            NEW.id,
            jsonb_build_object(
                'invoice_number', COALESCE(NEW.invoice_number, NEW.id::text), 
                'amount', NEW.amount
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Invoice schema fixed and audit trigger updated' as status;
