-- ==========================================
-- PHASE 17: WORKFLOW AUDIT TRAIL & HISTORY
-- ==========================================
-- Tracks granular transitions for compliance and transparency.

-- 1. Create Workflow History Table
CREATE TABLE IF NOT EXISTS public.workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
    related_id UUID NOT NULL, -- Generic ID (report_id or document_id)
    related_type TEXT NOT NULL CHECK (related_type IN ('report', 'document', 'signature')),
    actor_id UUID REFERENCES public.profiles(id),
    action_type TEXT NOT NULL, -- e.g., 'submitted', 'approved', 'rejected', 'visibility_toggled'
    from_status TEXT,
    to_status TEXT,
    change_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_history ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view history within their firm
CREATE POLICY "Staff can view workflow history" ON public.workflow_history
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE firm_id = workflow_history.firm_id
        )
    );

-- 2. Automation Trigger for Reports (matter_updates)
CREATE OR REPLACE FUNCTION public.log_workflow_transition()
RETURNS TRIGGER AS $$
DECLARE
    v_firm_id UUID;
BEGIN
    -- Get firm_id from matter
    SELECT firm_id INTO v_firm_id FROM public.matters WHERE id = NEW.matter_id;

    -- Only log if status changed OR client_visible changed
    IF (OLD.status IS NULL AND NEW.status IS NOT NULL) OR 
       (OLD.status IS DISTINCT FROM NEW.status) OR
       (OLD.client_visible IS DISTINCT FROM NEW.client_visible) THEN
       
        INSERT INTO public.workflow_history (
            firm_id,
            related_id,
            related_type,
            actor_id,
            action_type,
            from_status,
            to_status,
            change_reason,
            metadata
        ) VALUES (
            v_firm_id,
            NEW.id,
            'report',
            auth.uid(),
            CASE 
                WHEN OLD.status IS NULL THEN 'created'
                WHEN OLD.client_visible IS DISTINCT FROM NEW.client_visible THEN 'visibility_toggled'
                ELSE 'status_changed'
            END,
            OLD.status,
            NEW.status,
            NEW.rejection_reason,
            jsonb_build_object(
                'client_visible', NEW.client_visible,
                'is_final', NEW.is_final
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for reports
DROP TRIGGER IF EXISTS trg_log_report_workflow ON public.matter_updates;
CREATE TRIGGER trg_log_report_workflow
AFTER INSERT OR UPDATE ON public.matter_updates
FOR EACH ROW EXECUTE FUNCTION public.log_workflow_transition();

-- 3. Automation Trigger for Documents
CREATE OR REPLACE FUNCTION public.log_document_workflow()
RETURNS TRIGGER AS $$
DECLARE
    v_firm_id UUID;
    v_actor_id UUID;
BEGIN
    -- Actor is the current user (if any)
    v_actor_id := auth.uid();

    -- Only log if approval_status changed
    IF (OLD.approval_status IS DISTINCT FROM NEW.approval_status) THEN
        INSERT INTO public.workflow_history (
            firm_id,
            related_id,
            related_type,
            actor_id,
            action_type,
            from_status,
            to_status,
            metadata
        ) VALUES (
            NEW.firm_id, -- assuming firm_id exists on documents, if not we need to fetch via report
            NEW.id,
            'document',
            v_actor_id,
            'approval_status_changed',
            OLD.approval_status,
            NEW.approval_status,
            jsonb_build_object('filename', NEW.filename)
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Ensure documents table has firm_id. Migration 20260307_MATTER_EXPANSION_CORE.sql added it.
-- Trigger for documents
DROP TRIGGER IF EXISTS trg_log_document_workflow ON public.documents;
CREATE TRIGGER trg_log_document_workflow
AFTER UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.log_document_workflow();

SELECT '✅ Phase 17: Workflow Audit Trail & Automation initialized' AS status;
