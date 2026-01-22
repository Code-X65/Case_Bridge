-- ============================================================================
-- CASE MANAGEMENT LIFECYCLE - SIMPLIFIED FLOW
-- ============================================================================
-- This migration implements the simplified case lifecycle:
-- Pending → Reviewed → Assigned → Active → Closed
-- ============================================================================

-- ============================================================================
-- 1. CREATE COURT REPORTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.court_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE NOT NULL,
    associate_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    report_content TEXT NOT NULL,
    close_case BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for court_reports
ALTER TABLE public.court_reports ENABLE ROW LEVEL SECURITY;

-- Only assigned associate lawyers can create reports
DROP POLICY IF EXISTS "Assigned lawyers can create court reports" ON public.court_reports;
CREATE POLICY "Assigned lawyers can create court reports"
ON public.court_reports FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.case_assignments
        WHERE matter_id = court_reports.matter_id
        AND associate_id = auth.uid()
    )
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role = 'associate_lawyer'
        AND status = 'active'
    )
);

-- Internal users and clients can view court reports for their cases
DROP POLICY IF EXISTS "Users can view court reports" ON public.court_reports;
CREATE POLICY "Users can view court reports"
ON public.court_reports FOR SELECT
USING (
    -- Internal users can see reports for their firm's cases
    EXISTS (
        SELECT 1 FROM public.matters m
        INNER JOIN public.profiles p ON p.id = auth.uid()
        WHERE m.id = court_reports.matter_id
        AND m.firm_id = p.firm_id
        AND p.internal_role IS NOT NULL
        AND p.status = 'active'
    )
    OR
    -- Clients can see reports for their own cases
    EXISTS (
        SELECT 1 FROM public.matters m
        WHERE m.id = court_reports.matter_id
        AND m.client_id = auth.uid()
    )
);

-- ============================================================================
-- 2. CREATE COURT REPORT ATTACHMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.court_report_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    court_report_id UUID REFERENCES public.court_reports(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for court_report_attachments
ALTER TABLE public.court_report_attachments ENABLE ROW LEVEL SECURITY;

-- Associate lawyers can upload attachments to their reports
DROP POLICY IF EXISTS "Lawyers can upload report attachments" ON public.court_report_attachments;
CREATE POLICY "Lawyers can upload report attachments"
ON public.court_report_attachments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.court_reports cr
        WHERE cr.id = court_report_attachments.court_report_id
        AND cr.associate_id = auth.uid()
    )
);

-- Users can view attachments for reports they can see
DROP POLICY IF EXISTS "Users can view report attachments" ON public.court_report_attachments;
CREATE POLICY "Users can view report attachments"
ON public.court_report_attachments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.court_reports cr
        INNER JOIN public.matters m ON m.id = cr.matter_id
        INNER JOIN public.profiles p ON p.id = auth.uid()
        WHERE cr.id = court_report_attachments.court_report_id
        AND (
            (m.firm_id = p.firm_id AND p.internal_role IS NOT NULL)
            OR m.client_id = auth.uid()
        )
    )
);

-- ============================================================================
-- 3. ADD REVIEWED TRACKING COLUMNS TO MATTERS
-- ============================================================================

ALTER TABLE public.matters 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by_role TEXT;

-- ============================================================================
-- 4. UPDATE STATUS CONSTRAINT FOR SIMPLIFIED FLOW
-- ============================================================================

ALTER TABLE public.matters DROP CONSTRAINT IF EXISTS matters_status_check;
ALTER TABLE public.matters ADD CONSTRAINT matters_status_check 
CHECK (status IN (
    'Pending Review',
    'Reviewed', 
    'Assigned',
    'Active',
    'Ongoing',
    'Closed',
    'Completed',
    -- Keep legacy statuses for backward compatibility
    'Draft',
    'In Review',
    'Awaiting Documents',
    'In Progress',
    'On Hold',
    'Rejected'
));

-- ============================================================================
-- 5. CREATE SIMPLIFIED STATUS TRANSITION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.transition_case_status(
    p_matter_id UUID,
    p_new_status TEXT,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_status TEXT;
    v_firm_id UUID;
    v_actor_id UUID;
    v_actor_role TEXT;
    v_valid_transition BOOLEAN := FALSE;
    v_client_id UUID;
BEGIN
    -- Get current user context
    v_actor_id := auth.uid();
    
    -- Get actor role
    SELECT internal_role INTO v_actor_role
    FROM public.profiles
    WHERE id = v_actor_id;

    -- Get matter current state
    SELECT status, firm_id, client_id 
    INTO v_current_status, v_firm_id, v_client_id
    FROM public.matters
    WHERE id = p_matter_id;

    IF v_current_status IS NULL THEN
        RAISE EXCEPTION 'Matter not found';
    END IF;

    -- ========================================================================
    -- SIMPLIFIED STATE TRANSITION RULES
    -- ========================================================================
    
    -- Pending Review → Reviewed (Admin Manager or Case Manager reviews)
    IF v_current_status = 'Pending Review' AND p_new_status = 'Reviewed' THEN
        IF v_actor_role IN ('admin_manager', 'case_manager') THEN
            v_valid_transition := TRUE;
            
            -- Record who reviewed it
            UPDATE public.matters
            SET reviewed_by = v_actor_id,
                reviewed_at = NOW(),
                reviewed_by_role = v_actor_role
            WHERE id = p_matter_id;
        END IF;
    END IF;

    -- Reviewed → Assigned (Admin Manager or Case Manager assigns lawyer)
    IF v_current_status = 'Reviewed' AND p_new_status = 'Assigned' THEN
        IF v_actor_role IN ('admin_manager', 'case_manager') THEN
            v_valid_transition := TRUE;
        END IF;
    END IF;

    -- Assigned → Active/Ongoing (Associate Lawyer submits first report)
    IF v_current_status = 'Assigned' AND p_new_status IN ('Active', 'Ongoing') THEN
        IF v_actor_role = 'associate_lawyer' THEN
            v_valid_transition := TRUE;
        END IF;
    END IF;

    -- Active/Ongoing → Closed/Completed (Associate Lawyer closes case)
    IF v_current_status IN ('Active', 'Ongoing') AND p_new_status IN ('Closed', 'Completed') THEN
        IF v_actor_role = 'associate_lawyer' THEN
            v_valid_transition := TRUE;
        END IF;
    END IF;

    -- CHECK VALIDITY
    IF NOT v_valid_transition THEN
        RAISE EXCEPTION 'Invalid Status Transition: % → % not allowed for role %', 
            v_current_status, p_new_status, COALESCE(v_actor_role, 'unknown');
    END IF;

    -- ========================================================================
    -- EXECUTE UPDATE
    -- ========================================================================

    UPDATE public.matters
    SET 
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_matter_id;

    -- ========================================================================
    -- LOGGING
    -- ========================================================================
    
    INSERT INTO public.case_logs (
        matter_id,
        action,
        details,
        performed_by
    ) VALUES (
        p_matter_id,
        'status_changed',
        jsonb_build_object(
            'previous_status', v_current_status,
            'new_status', p_new_status,
            'note', p_note,
            'actor_role', v_actor_role
        ),
        v_actor_id
    );

    -- ========================================================================
    -- CLIENT NOTIFICATION
    -- ========================================================================
    
    -- Create notification for client
    INSERT INTO public.notifications (
        firm_id,
        user_id,
        type,
        title,
        message,
        payload
    ) VALUES (
        v_firm_id,
        v_client_id,
        'case_status_changed',
        'Case Status Updated',
        CASE p_new_status
            WHEN 'Reviewed' THEN 'Your case has been reviewed by our team'
            WHEN 'Assigned' THEN 'A lawyer has been assigned to your case'
            WHEN 'Active' THEN 'Your case is now active'
            WHEN 'Ongoing' THEN 'Your case is now ongoing'
            WHEN 'Closed' THEN 'Your case has been completed'
            WHEN 'Completed' THEN 'Your case has been completed'
            ELSE 'Your case status has been updated'
        END,
        jsonb_build_object(
            'matter_id', p_matter_id,
            'new_status', p_new_status,
            'previous_status', v_current_status
        )
    );

    RETURN jsonb_build_object('success', true, 'new_status', p_new_status);
END;
$$;

-- ============================================================================
-- 6. FUNCTION TO SUBMIT COURT REPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_court_report(
    p_matter_id UUID,
    p_report_content TEXT,
    p_close_case BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_id UUID;
    v_current_status TEXT;
    v_is_first_report BOOLEAN;
    v_report_id UUID;
    v_firm_id UUID;
    v_client_id UUID;
BEGIN
    -- Get current user
    v_actor_id := auth.uid();
    
    -- Verify user is assigned to this case
    IF NOT EXISTS (
        SELECT 1 FROM public.case_assignments
        WHERE matter_id = p_matter_id
        AND associate_id = v_actor_id
    ) THEN
        RAISE EXCEPTION 'You are not assigned to this case';
    END IF;

    -- Get matter details
    SELECT status, firm_id, client_id 
    INTO v_current_status, v_firm_id, v_client_id
    FROM public.matters
    WHERE id = p_matter_id;

    -- Check if this is the first report
    v_is_first_report := NOT EXISTS (
        SELECT 1 FROM public.court_reports
        WHERE matter_id = p_matter_id
    );

    -- Create the court report
    INSERT INTO public.court_reports (
        matter_id,
        associate_id,
        report_content,
        close_case
    ) VALUES (
        p_matter_id,
        v_actor_id,
        p_report_content,
        p_close_case
    ) RETURNING id INTO v_report_id;

    -- If first report and case is Assigned, transition to Active
    IF v_is_first_report AND v_current_status = 'Assigned' THEN
        PERFORM public.transition_case_status(p_matter_id, 'Active', 'First court report submitted');
    END IF;

    -- If close_case is true, transition to Closed
    IF p_close_case AND v_current_status IN ('Active', 'Ongoing') THEN
        PERFORM public.transition_case_status(p_matter_id, 'Closed', 'Case closed with final report');
    END IF;

    -- Log the report submission
    INSERT INTO public.case_logs (
        matter_id,
        action,
        details,
        performed_by
    ) VALUES (
        p_matter_id,
        'court_report_submitted',
        jsonb_build_object(
            'report_id', v_report_id,
            'is_first_report', v_is_first_report,
            'close_case', p_close_case
        ),
        v_actor_id
    );

    -- Notify client
    INSERT INTO public.notifications (
        firm_id,
        user_id,
        type,
        title,
        message,
        payload
    ) VALUES (
        v_firm_id,
        v_client_id,
        'court_report_submitted',
        'New Court Report',
        'A new court report has been added to your case',
        jsonb_build_object(
            'matter_id', p_matter_id,
            'report_id', v_report_id
        )
    );

    RETURN jsonb_build_object(
        'success', true, 
        'report_id', v_report_id,
        'is_first_report', v_is_first_report
    );
END;
$$;

-- ============================================================================
-- SCHEMA REFRESH
-- ============================================================================

NOTIFY pgrst, 'reload schema';
