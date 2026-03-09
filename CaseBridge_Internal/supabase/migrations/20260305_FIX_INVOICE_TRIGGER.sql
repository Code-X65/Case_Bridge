-- ==========================================
-- FIX: Remove bad trigger on invoices table
-- ==========================================
-- ERROR: record "new" has no field "matter_id" (code 42703)
-- CAUSE: A trigger function firing on INSERT to public.invoices
--        is referencing NEW.matter_id, which does not exist on invoices.
-- FIX:   Drop all unknown/bad triggers on invoices and keep only the
--        known valid one (emit_invoice_paid, which fires on UPDATE).
-- ==========================================

-- Step 1: Drop ALL triggers on invoices so we start clean.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'invoices'
          AND event_object_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.invoices', r.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- Step 2: Recreate the ONLY trigger that should exist on invoices:
--         emit_invoice_paid (fires on UPDATE when status -> 'paid')
CREATE OR REPLACE FUNCTION public.emit_invoice_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid' THEN
        INSERT INTO public.audit_logs (actor_id, firm_id, action, target_id, metadata)
        VALUES (
            auth.uid(),
            COALESCE(
                NEW.firm_id,
                (SELECT preferred_firm_id FROM public.case_reports WHERE invoice_id = NEW.id LIMIT 1)
            ),
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

DROP TRIGGER IF EXISTS trg_emit_invoice_paid ON public.invoices;
CREATE TRIGGER trg_emit_invoice_paid
AFTER UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.emit_invoice_paid();

SELECT '✅ Invoice trigger fixed: bad INSERT trigger removed, only emit_invoice_paid on UPDATE remains.' AS status;
