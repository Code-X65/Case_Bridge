-- ==========================================================
-- PHASE 14: ESIGNATURE WORKFLOW
-- Creates signature_requests table and supporting infrastructure
-- ==========================================================

-- 1. Create signature_requests table
CREATE TABLE IF NOT EXISTS public.signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    client_id UUID,                   -- References the external client user
    firm_id UUID REFERENCES public.firms(id),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
    signature_data TEXT,              -- Base64 PNG of the drawn/typed signature
    signed_at TIMESTAMPTZ,
    message TEXT,                     -- Optional note from Case Manager to client
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.signature_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS: Internal staff can manage all requests in their firm
DROP POLICY IF EXISTS "staff_manage_signature_requests" ON public.signature_requests;
CREATE POLICY "staff_manage_signature_requests" ON public.signature_requests
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- 4. RLS: Clients can view and update their own requests
DROP POLICY IF EXISTS "client_view_own_signature_requests" ON public.signature_requests;
CREATE POLICY "client_view_own_signature_requests" ON public.signature_requests
FOR ALL TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

-- 5. Grant permissions
GRANT ALL ON public.signature_requests TO authenticated;

-- 6. Add published_at to matter_updates for tracking when CM approves
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'matter_updates' AND column_name = 'published_at'
    ) THEN
        ALTER TABLE public.matter_updates ADD COLUMN published_at TIMESTAMPTZ;
    END IF;
END $$;

-- 7. Update the approval trigger to stamp published_at when approved
-- (The frontend already sets status='published' and client_visible=true)
-- This trigger stamps the time automatically
CREATE OR REPLACE FUNCTION public.stamp_published_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_visible = TRUE AND OLD.client_visible = FALSE THEN
        NEW.published_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_stamp_published_at ON public.matter_updates;
CREATE TRIGGER trg_stamp_published_at
BEFORE UPDATE ON public.matter_updates
FOR EACH ROW
EXECUTE FUNCTION public.stamp_published_at();

-- 8. Notification trigger: notify client when a report is approved
CREATE OR REPLACE FUNCTION public.notify_client_report_approved()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_firm_id UUID;
BEGIN
    -- Only trigger when client_visible switches to TRUE
    IF NEW.client_visible = TRUE AND OLD.client_visible = FALSE THEN
        BEGIN
            SELECT m.client_id, m.firm_id INTO v_client_id, v_firm_id
            FROM public.matters m WHERE m.id = NEW.matter_id;

            IF FOUND AND v_client_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    v_client_id, v_firm_id,
                    'report_approved',
                    'Your Case Has an Update',
                    'A new progress report "' || NEW.title || '" has been published to your file.',
                    NEW.matter_id
                );
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Approval notification skipped: %', SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_client_report_approved ON public.matter_updates;
CREATE TRIGGER trg_notify_client_report_approved
AFTER UPDATE ON public.matter_updates
FOR EACH ROW
EXECUTE FUNCTION public.notify_client_report_approved();

NOTIFY pgrst, 'reload schema';
SELECT '✅ Phase 14: eSignature & Report Approval infrastructure created' AS status;
