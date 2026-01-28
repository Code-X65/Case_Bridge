-- ========================================================
-- RECONCILE CASE REPORT STATUS ENUM
-- ========================================================

-- Ensure 'closed' and 'in_progress' exist in report_status enum
-- This prevents 400 Errors when workflows try to sync matter state back to intake reports
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'report_status' AND e.enumlabel = 'closed') THEN
        ALTER TYPE public.report_status ADD VALUE 'closed';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'report_status' AND e.enumlabel = 'in_progress') THEN
        ALTER TYPE public.report_status ADD VALUE 'in_progress';
    END IF;
END $$;

SELECT '✅ Case Report Status enum reconciled with canonical lifecycle' as status;
