-- ========================================================
-- CLIENT CASE VISIBILITY & DOCUMENTS v1 (CANONICAL)
-- ========================================================

-- 1. BASE DOCUMENTS TABLE
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_url TEXT NOT NULL, -- Storage path/reference
    filename TEXT NOT NULL,
    uploaded_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    uploaded_by_role TEXT NOT NULL, -- role label
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CASE DOCUMENTS MAPPING (With Visibility Flag)
CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    client_visible BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(case_id, document_id)
);

-- 3. ENABLE RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR DOCUMENTS
-- Internal users can see all documents
DROP POLICY IF EXISTS "Staff can view all documents" ON public.documents;
CREATE POLICY "Staff can view all documents" 
ON public.documents FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);

-- Clients can see documents ONLY if they are marked client_visible and belong to their case
DROP POLICY IF EXISTS "Clients can view visible case documents" ON public.documents;
CREATE POLICY "Clients can view visible case documents" 
ON public.documents FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.case_documents cd
        JOIN public.matters m ON m.id = cd.case_id
        WHERE cd.document_id = public.documents.id
        AND cd.client_visible = TRUE
        AND m.client_id = auth.uid()
    )
);

-- Internal users can upload documents
DROP POLICY IF EXISTS "Staff can upload documents" ON public.documents;
CREATE POLICY "Staff can upload documents" 
ON public.documents FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);

-- 5. RLS POLICIES FOR CASE_DOCUMENTS
DROP POLICY IF EXISTS "Staff can manage case document mapping" ON public.case_documents;
CREATE POLICY "Staff can manage case document mapping" 
ON public.case_documents FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Clients can view case document mapping" ON public.case_documents;
CREATE POLICY "Clients can view case document mapping" 
ON public.case_documents FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = public.case_documents.case_id
        AND m.client_id = auth.uid()
        AND public.case_documents.client_visible = TRUE
    )
);

-- 6. PROJECT MATTERS TO CLIENTS
-- Ensure matters are readable by the owner (client_id)
DROP POLICY IF EXISTS "Clients can view their own matters" ON public.matters;
CREATE POLICY "Clients can view their own matters" 
ON public.matters FOR SELECT 
USING (client_id = auth.uid());

-- 7. HELPER FOR INITIAL DATA MIGRATION
-- Migrate case_report_documents to the new canonical structure if any exist
DO $$
DECLARE
    r RECORD;
    v_doc_id UUID;
    v_matter_id UUID;
BEGIN
    FOR r IN SELECT * FROM public.case_report_documents LOOP
        -- Create base document
        INSERT INTO public.documents (filename, file_url, uploaded_by_user_id, uploaded_by_role)
        VALUES (r.file_name, r.file_path, (SELECT client_id FROM public.case_reports WHERE id = r.case_report_id), 'client')
        RETURNING id INTO v_doc_id;

        -- Link to matter if it exists
        SELECT id INTO v_matter_id FROM public.matters WHERE case_report_id = r.case_report_id;
        IF v_matter_id IS NOT NULL THEN
            INSERT INTO public.case_documents (case_id, document_id, client_visible)
            VALUES (v_matter_id, v_doc_id, TRUE) -- Client uploads are always visible to client
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

SELECT '✅ Canonical Document Schema (v1) Applied' AS status;
