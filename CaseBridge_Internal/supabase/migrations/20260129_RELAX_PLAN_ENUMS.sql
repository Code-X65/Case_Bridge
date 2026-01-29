-- ==========================================
-- CONVERT ENUM TO TEXT FOR PLAN TYPES
-- ==========================================
-- This migration allows for dynamic plan names defined by firms
-- instead of a restrictive system-wide enum.

-- 1. Modify invoices table
ALTER TABLE public.invoices 
    ALTER COLUMN plan_type SET DATA TYPE TEXT;

-- 2. Modify case_reports table
ALTER TABLE public.case_reports 
    ALTER COLUMN intake_plan SET DATA TYPE TEXT;

-- 3. Update security gating function to use TEXT
CREATE OR REPLACE FUNCTION public.enforce_case_payment_gate()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_status public.invoice_status_type;
    v_invoice_plan TEXT; -- Changed from public.intake_plan_type
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

SELECT '✅ Plan type columns and security gate successfully converted to TEXT' as status;
