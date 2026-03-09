-- ==========================================
-- PHASE 13: ADVANCED CASE INTERACTIONS
-- ==========================================

-- 1. Enhance Audit Logs for Matter-level tracking
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_audit_logs_matter_id ON public.audit_logs(matter_id);

-- 2. Case Messaging System (Group Chat)
-- This facilitates communication between client and assigned staff (Assigned Associate/CM)
CREATE TABLE IF NOT EXISTS public.matter_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Messaging
ALTER TABLE public.matter_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their assigned matters"
ON public.matter_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = matter_messages.matter_id
        AND (
            m.client_id = auth.uid() OR
            m.assigned_associate = auth.uid() OR
            m.assigned_case_manager = auth.uid() OR
            EXISTS (SELECT 1 FROM public.user_firm_roles ufr WHERE ufr.user_id = auth.uid() AND ufr.role = 'admin_manager')
        )
    )
);

CREATE POLICY "Users can send messages to their assigned matters"
ON public.matter_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = matter_messages.matter_id
        AND (
            m.client_id = auth.uid() OR
            m.assigned_associate = auth.uid() OR
            m.assigned_case_manager = auth.uid()
        )
    )
);

-- 3. Matter Report Comments (Client Feedback on Updates)
CREATE TABLE IF NOT EXISTS public.matter_update_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_id UUID NOT NULL REFERENCES public.matter_updates(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Comments
ALTER TABLE public.matter_update_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on their updates"
ON public.matter_update_comments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matter_updates mu
        JOIN public.matters m ON m.id = mu.matter_id
        WHERE mu.id = matter_update_comments.update_id
        AND (
            m.client_id = auth.uid() OR
            m.assigned_associate = auth.uid() OR
            m.assigned_case_manager = auth.uid() OR
             EXISTS (SELECT 1 FROM public.user_firm_roles ufr WHERE ufr.user_id = auth.uid() AND ufr.role = 'admin_manager')
        )
    )
);

CREATE POLICY "Users can post comments on their updates"
ON public.matter_update_comments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.matter_updates mu
        JOIN public.matters m ON m.id = mu.matter_id
        WHERE mu.id = matter_update_comments.update_id
        AND (
            m.client_id = auth.uid() OR
            m.assigned_associate = auth.uid() OR
            m.assigned_case_manager = auth.uid()
        )
    )
);

-- 4. Document Support for Comments
-- Allows clients/staff to attach documents to a specific comment
CREATE TABLE IF NOT EXISTS public.matter_comment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.matter_update_comments(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE
);

ALTER TABLE public.matter_comment_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comment documents"
ON public.matter_comment_documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matter_update_comments muc
        WHERE muc.id = matter_comment_documents.comment_id
    )
);

-- 5. Helper function for matter auditing
CREATE OR REPLACE FUNCTION public.log_matter_event(
    p_matter_id UUID, 
    p_action TEXT, 
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_firm_id UUID;
BEGIN
    SELECT firm_id INTO v_firm_id FROM public.matters WHERE id = p_matter_id;
    
    INSERT INTO public.audit_logs (firm_id, user_id, matter_id, action, details)
    VALUES (v_firm_id, auth.uid(), p_matter_id, p_action, p_details);
END;
$$;

SELECT '✅ Advanced Case Interaction schema enabled (Phase 13)' AS status;
