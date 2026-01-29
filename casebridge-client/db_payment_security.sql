-- ========================================================
-- CASEBRIDGE PAYMENT SECURITY & ENFORCEMENT v1
-- ========================================================

-- 1. ENFORCE INVOICE VALIDITY ON SUBMISSION
CREATE OR REPLACE FUNCTION public.enforce_case_payment_gate()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_status public.invoice_status_type;
    v_invoice_plan public.intake_plan_type;
BEGIN
    -- 1. Check Invoice Presence
    IF NEW.invoice_id IS NULL THEN
        RAISE EXCEPTION 'Case creation rejected: Valid Intake Priority Invoice Required.';
    END IF;

    -- 2. Check Invoice Status
    SELECT status, plan_type INTO v_invoice_status, v_invoice_plan
    FROM public.invoices 
    WHERE id = NEW.invoice_id;

    IF v_invoice_status IS DISTINCT FROM 'paid' THEN
        RAISE EXCEPTION 'Case creation rejected: Invoice % is not paid (Current Status: %).', NEW.invoice_id, v_invoice_status;
    END IF;

    -- 3. Enforce Data Integrity (Override user input for plan)
    NEW.intake_plan := v_invoice_plan;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind Trigger
DROP TRIGGER IF EXISTS trg_check_payment_gate ON public.case_reports;
CREATE TRIGGER trg_check_payment_gate
BEFORE INSERT ON public.case_reports
FOR EACH ROW EXECUTE FUNCTION public.enforce_case_payment_gate();

-- 2. PREVENT INVOICE REUSE (Already handled by Unique Index, but double check)
-- The unique index `idx_case_reports_invoice_id` created in `db_payment_v1.sql` handles this.

SELECT '✅ Payment Security & Enforcement Applied' as status;
