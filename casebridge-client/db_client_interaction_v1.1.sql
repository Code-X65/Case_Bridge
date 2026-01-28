-- ========================================================
-- CLIENT CASE INTERACTION v1.1 (CANONICAL)
-- ========================================================

-- 1. CASE INTERACTION REPORTS (Updates for clients)
-- Named 'matter_updates' to avoid collision with 'case_reports' (intake)
CREATE TABLE IF NOT EXISTS public.matter_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id),
    author_role TEXT NOT NULL CHECK (author_role IN ('case_manager', 'associate_lawyer')),
    content TEXT NOT NULL,
    client_visible BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. REPORT DOCUMENTS (Junction with Visibility)
CREATE TABLE IF NOT EXISTS public.report_documents (
    report_id UUID NOT NULL REFERENCES public.matter_updates(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    client_visible BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (report_id, document_id)
);

-- 3. CASE MESSAGING
CREATE TABLE IF NOT EXISTS public.case_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL, -- Link to auth.users or profiles
    sender_role TEXT NOT NULL, -- client, case_manager, associate_lawyer
    message_body TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MESSAGE DOCUMENTS
CREATE TABLE IF NOT EXISTS public.message_documents (
    message_id UUID NOT NULL REFERENCES public.case_messages(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    PRIMARY KEY (message_id, document_id)
);

-- 5. RLS - MATTER UPDATES
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage all matter updates" ON public.matter_updates;
CREATE POLICY "Staff can manage all matter updates" 
ON public.matter_updates FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Clients can view visible matter updates" ON public.matter_updates;
CREATE POLICY "Clients can view visible matter updates" 
ON public.matter_updates FOR SELECT 
USING (
    matter_id IN (SELECT id FROM public.matters WHERE client_id = auth.uid())
    AND client_visible = TRUE
);

-- 6. RLS - REPORT DOCUMENTS
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can manage report documents" ON public.report_documents;
CREATE POLICY "Staff can manage report documents" 
ON public.report_documents FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.user_firm_roles 
        WHERE user_id = auth.uid() 
        AND status = 'active'
    )
);

DROP POLICY IF EXISTS "Clients can view visible report documents" ON public.report_documents;
CREATE POLICY "Clients can view visible report documents" 
ON public.report_documents FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.matter_updates mu
        JOIN public.matters m ON m.id = mu.matter_id
        WHERE mu.id = public.report_documents.report_id
        AND m.client_id = auth.uid()
        AND public.report_documents.client_visible = TRUE
        AND mu.client_visible = TRUE
    )
);

-- 7. RLS - CASE MESSAGES
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages for their cases" ON public.case_messages;
CREATE POLICY "Users can view messages for their cases" 
ON public.case_messages FOR SELECT 
USING (
    matter_id IN (SELECT id FROM public.matters WHERE client_id = auth.uid()) -- Client view
    OR 
    EXISTS ( -- Staff view
        SELECT 1 FROM public.user_firm_roles ufr
        JOIN public.matters m ON m.firm_id = ufr.firm_id
        WHERE m.id = public.case_messages.matter_id
        AND ufr.user_id = auth.uid()
        AND ufr.status = 'active'
    )
);

DROP POLICY IF EXISTS "Users can send messages to their cases" ON public.case_messages;
CREATE POLICY "Users can send messages to their cases" 
ON public.case_messages FOR INSERT 
WITH CHECK (
    matter_id IN (SELECT id FROM public.matters WHERE client_id = auth.uid()) -- Client send
    OR 
    EXISTS ( -- Staff send
        SELECT 1 FROM public.user_firm_roles ufr
        JOIN public.matters m ON m.firm_id = ufr.firm_id
        WHERE m.id = matter_id
        AND ufr.user_id = auth.uid()
        AND ufr.status = 'active'
    )
);

-- 8. INTEGRATION: Map documents table to visible RLS if linked via reports or messages
-- Update public.documents RLS to include report/message visibility
DROP POLICY IF EXISTS "Clients can view visible case documents" ON public.documents;
CREATE POLICY "Clients can view visible case documents" 
ON public.documents FOR SELECT 
USING (
    -- Direct visibility via report mapping
    EXISTS (
        SELECT 1 FROM public.report_documents rd
        JOIN public.matter_updates mu ON mu.id = rd.report_id
        JOIN public.matters m ON m.id = mu.matter_id
        WHERE rd.document_id = public.documents.id
        AND m.client_id = auth.uid()
        AND rd.client_visible = TRUE
        AND mu.client_visible = TRUE
    )
    OR
    -- Visibility via message mapping
    EXISTS (
        SELECT 1 FROM public.message_documents md
        JOIN public.case_messages cm ON cm.id = md.message_id
        JOIN public.matters m ON m.id = cm.matter_id
        WHERE md.document_id = public.documents.id
        AND m.client_id = auth.uid()
    )
);

-- 9. NOTIFICATION TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_client_interaction_events()
RETURNS TRIGGER AS $$
BEGIN
    -- Report Hook
    IF TG_TABLE_NAME = 'matter_updates' AND NEW.client_visible = TRUE THEN
        PERFORM public.log_firm_event(
            (SELECT firm_id FROM public.matters WHERE id = NEW.matter_id),
            'client_visible_report_posted',
            jsonb_build_object('matter_id', NEW.matter_id, 'report_id', NEW.id)
        );
    END IF;

    -- Message Hook
    IF TG_TABLE_NAME = 'case_messages' THEN
        PERFORM public.log_firm_event(
            (SELECT firm_id FROM public.matters WHERE id = NEW.matter_id),
            'case_message_received',
            jsonb_build_object('matter_id', NEW.matter_id, 'message_id', NEW.id, 'sender_role', NEW.sender_role)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_matter_update_notify ON public.matter_updates;
CREATE TRIGGER trg_matter_update_notify
AFTER INSERT OR UPDATE ON public.matter_updates
FOR EACH ROW EXECUTE FUNCTION public.handle_client_interaction_events();

DROP TRIGGER IF EXISTS trg_case_message_notify ON public.case_messages;
CREATE TRIGGER trg_case_message_notify
AFTER INSERT ON public.case_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_client_interaction_events();

SELECT '✅ Client Case Interaction v1.1 Schema Applied' AS status;
