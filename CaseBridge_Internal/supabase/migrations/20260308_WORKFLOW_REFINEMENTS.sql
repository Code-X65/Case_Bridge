-- ==========================================
-- PHASE 16: WORKFLOW REFINEMENTS & DOCUMENT STATUS
-- ==========================================
-- Adds drafting, rejection feedback, and formal document approval.

-- 1. ENHANCE Progress Reports (matter_updates)
-- Add rejection_reason for feedback from Case Managers
ALTER TABLE public.matter_updates 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update status check constraint if it exists (dropping and recreating to ensure sync)
-- Note: In 20260307_MATTER_EXPANSION_CORE.sql it was added with CHECK (status IN ('draft', 'under_review', 'published'))
ALTER TABLE public.matter_updates DROP CONSTRAINT IF EXISTS matter_updates_status_check;
ALTER TABLE public.matter_updates ADD CONSTRAINT matter_updates_status_check 
CHECK (status IN ('draft', 'under_review', 'published', 'rejected'));

-- 2. ENHANCE Document Tables (Approval Status)
-- A. Documents (Staff uploads/Report attachments)
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- B. Case Report Documents (Intake evidence)
ALTER TABLE public.case_report_documents 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- C. Client Documents (Personal Vault)
ALTER TABLE public.client_documents 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 3. UPDATE Notification Trigger for Rejection Flow
CREATE OR REPLACE FUNCTION public.notify_report_workflow()
RETURNS TRIGGER AS $$
DECLARE
    v_matter_rec RECORD;
    v_author_name TEXT;
BEGIN
    BEGIN
        SELECT m.title, m.client_id, m.firm_id, m.assigned_case_manager 
        INTO v_matter_rec 
        FROM public.matters m 
        WHERE m.id = NEW.matter_id;

        IF NOT FOUND THEN
            RETURN NEW;
        END IF;

        SELECT full_name INTO v_author_name 
        FROM public.profiles 
        WHERE id = NEW.author_id;

        -- CASE 1: NEW SUBMISSION (Associate -> Case Manager)
        IF (TG_OP = 'INSERT') THEN
            -- Only notify Case Manager if status is 'under_review' (NOT 'draft')
            IF NEW.status = 'under_review' AND v_matter_rec.assigned_case_manager IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    v_matter_rec.assigned_case_manager, 
                    v_matter_rec.firm_id, 
                    'report_submitted', 
                    'New Report for Approval', 
                    'Associate ' || COALESCE(v_author_name, 'Lawyer') || ' submitted a report for "' || v_matter_rec.title || '".', 
                    NEW.matter_id
                );
            END IF;

            -- Case Manager submits published report directly (Client Notification)
            IF NEW.status = 'published' AND NEW.client_visible = TRUE AND v_matter_rec.client_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    v_matter_rec.client_id, 
                    v_matter_rec.firm_id, 
                    'report_approved', 
                    'Your Case Has an Update', 
                    'A new progress report "' || NEW.title || '" has been published.', 
                    NEW.matter_id
                );
            END IF;
        END IF;

        -- CASE 2: STATUS CHANGE / APPROVAL / REJECTION
        IF (TG_OP = 'UPDATE') THEN
            -- Approval Notification to Associate
            IF NEW.status = 'published' AND OLD.status = 'under_review' AND NEW.author_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    NEW.author_id, 
                    v_matter_rec.firm_id, 
                    'report_approved', 
                    'Report Approved', 
                    'Your report "' || NEW.title || '" has been approved and published.', 
                    NEW.matter_id
                );
            END IF;

            -- REJECTION Notification to Associate
            IF NEW.status = 'rejected' AND OLD.status = 'under_review' AND NEW.author_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    NEW.author_id, 
                    v_matter_rec.firm_id, 
                    'report_rejected', 
                    'Report Returned with Comments', 
                    'Your report "' || NEW.title || '" was returned for corrections: ' || COALESCE(LEFT(NEW.rejection_reason, 50), 'Check comments for details.'), 
                    NEW.matter_id
                );
            END IF;

            -- Visibility Notification to Client
            IF NEW.client_visible = TRUE AND (OLD.client_visible = FALSE OR OLD.status != 'published') AND NEW.status = 'published' AND v_matter_rec.client_id IS NOT NULL THEN
                INSERT INTO public.notifications (user_id, firm_id, type, title, message, related_case_id)
                VALUES (
                    v_matter_rec.client_id, 
                    v_matter_rec.firm_id, 
                    'report_approved', 
                    'Your Case Has an Update', 
                    'A new progress report "' || NEW.title || '" has been published to your file.', 
                    NEW.matter_id
                );
            END IF;
        END IF;

    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Notification failed: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Phase 16: Workflow Refinements applied' AS status;
