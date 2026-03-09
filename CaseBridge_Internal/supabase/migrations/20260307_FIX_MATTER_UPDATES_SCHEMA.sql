-- ==========================================================
-- ROBUST SCHEMA REPAIR: MATTER UPDATES, RELATIONSHIPS & RLS
-- ==========================================================
-- This script cleans invalid data and restores missing relationships 
-- that cause PostgREST 400 errors.

-- 1. PRE-CLEAN: Remove orphans that would block foreign key creation
DELETE FROM public.matter_updates WHERE matter_id NOT IN (SELECT id FROM public.matters);
DELETE FROM public.matter_updates WHERE author_id NOT IN (SELECT id FROM public.profiles) AND author_id IS NOT NULL;
DELETE FROM public.report_documents WHERE report_id NOT IN (SELECT id FROM public.matter_updates);
DELETE FROM public.report_documents WHERE document_id NOT IN (SELECT id FROM public.documents);

-- 2. ENFORCE COLUMNS: matter_updates
DO $$ 
BEGIN 
    -- Ensure columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matter_updates' AND column_name='status') THEN
        ALTER TABLE public.matter_updates ADD COLUMN status TEXT DEFAULT 'under_review';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matter_updates' AND column_name='is_final') THEN
        ALTER TABLE public.matter_updates ADD COLUMN is_final BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matter_updates' AND column_name='author_role') THEN
        ALTER TABLE public.matter_updates ADD COLUMN author_role TEXT;
    END IF;

    -- Standardize author_id
    ALTER TABLE public.matter_updates ALTER COLUMN author_id TYPE UUID USING author_id::uuid;
END $$;

-- 3. ENFORCE FOREIGN KEYS: matter_updates
-- This is CRITICAL for author:author_id(full_name) selects
ALTER TABLE public.matter_updates DROP CONSTRAINT IF EXISTS matter_updates_author_id_fkey;
ALTER TABLE public.matter_updates ADD CONSTRAINT matter_updates_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.matter_updates DROP CONSTRAINT IF EXISTS matter_updates_matter_id_fkey;
ALTER TABLE public.matter_updates ADD CONSTRAINT matter_updates_matter_id_fkey 
    FOREIGN KEY (matter_id) REFERENCES public.matters(id) ON DELETE CASCADE;

-- 4. FORCE report_documents JUNCTION
-- This is CRITICAL for docs:report_documents(...) selects
CREATE TABLE IF NOT EXISTS public.report_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Re-add constraints to ensure PostgREST "sees" the relationships
    CONSTRAINT report_documents_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.matter_updates(id) ON DELETE CASCADE,
    CONSTRAINT report_documents_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE
);

-- 5. REPAIR NOTIFICATIONS TABLE
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='firm_id') THEN
        ALTER TABLE public.notifications ADD COLUMN firm_id UUID;
    END IF;
    
    -- Ensure both is_read (new) and read (old) exist if triggers expect them
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='is_read') THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 6. FAIL-SAFE NOTIFICATION TRIGGER
CREATE OR REPLACE FUNCTION public.notify_report_update()
RETURNS TRIGGER AS $$
DECLARE
    v_matter_rec RECORD;
BEGIN
    -- Wrap in EXCEPTION block to never block the main transaction
    BEGIN
        SELECT m.client_id, m.firm_id INTO v_matter_rec FROM public.matters m WHERE m.id = NEW.matter_id;
        
        IF FOUND AND NEW.client_visible = TRUE AND v_matter_rec.client_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
            VALUES (v_matter_rec.client_id, v_matter_rec.firm_id, 'report_update', 'Case Update', 'A new report was posted.', NEW.matter_id);
        END IF;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Notification failed but report saved';
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RE-ENFORCE RLS
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_updates" ON public.matter_updates;
CREATE POLICY "admins_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_admin_or_case_manager())
WITH CHECK (public.is_admin_or_case_manager());

DROP POLICY IF EXISTS "associates_manage_assigned_updates" ON public.matter_updates;
CREATE POLICY "associates_manage_assigned_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (
    public.is_associate_lawyer() 
    AND EXISTS (SELECT 1 FROM public.matters m WHERE m.id = matter_id AND m.assigned_associate = auth.uid())
)
WITH CHECK (true);

-- Allow all authenticated users to read reports (if they have firm access via other policies)
DROP POLICY IF EXISTS "staff_view_updates" ON public.matter_updates;
CREATE POLICY "staff_view_updates" ON public.matter_updates FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_view_report_docs" ON public.report_documents;
CREATE POLICY "staff_view_report_docs" ON public.report_documents FOR SELECT TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
SELECT '✅ Robust Relationship Restoration Complete' AS status;
