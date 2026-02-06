-- ==========================================
-- FIX CASE_MEETINGS SCHEMA FOR RESCHEDULE FLOW
-- Ensures all columns needed for the scheduling modal exist
-- ==========================================

DO $$
BEGIN
    -- Core identification columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'case_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN case_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'client_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN client_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'lawyer_user_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN lawyer_user_id UUID;
    END IF;

    -- Meeting type and location
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'meeting_type') THEN
        ALTER TABLE public.case_meetings ADD COLUMN meeting_type TEXT DEFAULT 'virtual';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'location') THEN
        ALTER TABLE public.case_meetings ADD COLUMN location TEXT;
    END IF;

    -- Status tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'status') THEN
        ALTER TABLE public.case_meetings ADD COLUMN status TEXT DEFAULT 'requested';
    END IF;

    -- Time fields (CLIENT PROPOSED)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'proposed_start') THEN
        ALTER TABLE public.case_meetings ADD COLUMN proposed_start TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'proposed_end') THEN
        ALTER TABLE public.case_meetings ADD COLUMN proposed_end TIMESTAMPTZ;
    END IF;

    -- Time fields (LAWYER CONFIRMED)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'confirmed_start') THEN
        ALTER TABLE public.case_meetings ADD COLUMN confirmed_start TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'confirmed_end') THEN
        ALTER TABLE public.case_meetings ADD COLUMN confirmed_end TIMESTAMPTZ;
    END IF;

    -- Video meeting details
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'video_provider') THEN
        ALTER TABLE public.case_meetings ADD COLUMN video_provider TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'video_meeting_link') THEN
        ALTER TABLE public.case_meetings ADD COLUMN video_meeting_link TEXT;
    END IF;

    -- Notes and context
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'client_note') THEN
        ALTER TABLE public.case_meetings ADD COLUMN client_note TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'internal_note') THEN
        ALTER TABLE public.case_meetings ADD COLUMN internal_note TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'rejection_note') THEN
        ALTER TABLE public.case_meetings ADD COLUMN rejection_note TEXT;
    END IF;

    -- Timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'created_at') THEN
        ALTER TABLE public.case_meetings ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'updated_at') THEN
        ALTER TABLE public.case_meetings ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Legacy compatibility (if needed)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'title') THEN
        ALTER TABLE public.case_meetings ADD COLUMN title TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'description') THEN
        ALTER TABLE public.case_meetings ADD COLUMN description TEXT;
    END IF;
END $$;

-- Ensure Foreign Key Relationships are set up correctly
DO $$
BEGIN
    -- Drop existing constraints to avoid conflicts
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_case_id_fkey;
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_client_id_fkey;
    ALTER TABLE public.case_meetings DROP CONSTRAINT IF EXISTS case_meetings_lawyer_user_id_fkey;

    -- Add clean foreign keys
    ALTER TABLE public.case_meetings 
        ADD CONSTRAINT case_meetings_case_id_fkey 
        FOREIGN KEY (case_id) 
        REFERENCES public.matters(id) 
        ON DELETE CASCADE;

    ALTER TABLE public.case_meetings 
        ADD CONSTRAINT case_meetings_client_id_fkey 
        FOREIGN KEY (client_id) 
        REFERENCES public.external_users(id) 
        ON DELETE SET NULL;

    ALTER TABLE public.case_meetings 
        ADD CONSTRAINT case_meetings_lawyer_user_id_fkey 
        FOREIGN KEY (lawyer_user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
END $$;

-- Enable RLS
ALTER TABLE public.case_meetings ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "staff_all_meetings" ON public.case_meetings;
DROP POLICY IF EXISTS "client_view_own_meetings" ON public.case_meetings;

-- Staff can manage all meetings
CREATE POLICY "staff_all_meetings" ON public.case_meetings
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('case_manager', 'associate_lawyer', 'admin_manager')
    )
);

-- Clients can view/update their own meetings
CREATE POLICY "client_own_meetings" ON public.case_meetings
FOR ALL TO authenticated
USING (client_id = auth.uid());

-- Grant permissions
GRANT ALL ON public.case_meetings TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';

-- Verification
SELECT 
    '✅ CASE_MEETINGS SCHEMA FIXED' as status,
    COUNT(*) as total_columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'case_meetings';
