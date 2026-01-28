-- ========================================================
-- RECONCILE MATTER UPDATES (PROGRESS REPORTS)
-- ========================================================

-- 1. Ensure 'title' exists in matter_updates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matter_updates' AND column_name='title') THEN
        ALTER TABLE public.matter_updates ADD COLUMN title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matter_updates' AND column_name='is_final') THEN
        ALTER TABLE public.matter_updates ADD COLUMN is_final BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Update existing records if any (set title from snippet of content)
UPDATE public.matter_updates SET title = LEFT(content, 50) || '...' WHERE title IS NULL;
ALTER TABLE public.matter_updates ALTER COLUMN title SET NOT NULL;

-- 3. Ensure report_documents exists (Mapping to junction for multi-file support)
CREATE TABLE IF NOT EXISTS public.report_documents (
    report_id UUID NOT NULL REFERENCES public.matter_updates(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    client_visible BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (report_id, document_id)
);

SELECT '✅ Matter Updates reconciled with Title support and Junction table' as status;
