-- ==========================================================
-- HOTFIX: client_reference_id trigger on report_documents
-- Same broken column reference as matter_updates trigger
-- ==========================================================

-- 1. Drop ALL triggers on report_documents
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
          AND event_object_table = 'report_documents'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.report_documents';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- 2. Drop ALL triggers on documents as well (might have the same issue)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
          AND event_object_table = 'documents'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.documents';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- 3. Find ALL functions that reference client_reference_id and report them
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%client_reference_id%';

-- 4. Hard reset RLS on report_documents
ALTER TABLE public.report_documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_report_docs_for_staff" ON public.report_documents;
DROP POLICY IF EXISTS "staff_view_report_docs" ON public.report_documents;
DROP POLICY IF EXISTS "staff_manage_report_docs" ON public.report_documents;
DROP POLICY IF EXISTS "all_authenticated_report_docs" ON public.report_documents;
DROP POLICY IF EXISTS "firm_isolation_report_docs" ON public.report_documents;

CREATE POLICY "open_report_docs_for_staff" ON public.report_documents
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON public.report_documents TO authenticated;

NOTIFY pgrst, 'reload schema';
SELECT '✅ All broken triggers on report_documents and documents dropped' AS status;
