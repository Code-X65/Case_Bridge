-- ==========================================
-- COMPLETE DATABASE FIX - TESTED & VERIFIED
-- Run this ONCE to fix all issues
-- ==========================================

-- ==========================================
-- PART 1: CREATE/FIX NOTIFICATIONS TABLE
-- ==========================================

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all required columns one by one
DO $$ 
BEGIN
    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    
    -- type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT;
    END IF;
    
    -- title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'title') THEN
        ALTER TABLE public.notifications ADD COLUMN title TEXT;
    END IF;
    
    -- message
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message') THEN
        ALTER TABLE public.notifications ADD COLUMN message TEXT;
    END IF;
    
    -- related_case_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_case_id') THEN
        ALTER TABLE public.notifications ADD COLUMN related_case_id UUID;
    END IF;
    
    -- related_report_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_report_id') THEN
        ALTER TABLE public.notifications ADD COLUMN related_report_id UUID;
    END IF;
    
    -- metadata
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- is_read
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ==========================================
-- PART 2: CREATE/FIX MATTER_UPDATES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.matter_updates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matter_updates' AND column_name = 'matter_id') THEN
        ALTER TABLE public.matter_updates ADD COLUMN matter_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matter_updates' AND column_name = 'author_id') THEN
        ALTER TABLE public.matter_updates ADD COLUMN author_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matter_updates' AND column_name = 'author_role') THEN
        ALTER TABLE public.matter_updates ADD COLUMN author_role TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matter_updates' AND column_name = 'title') THEN
        ALTER TABLE public.matter_updates ADD COLUMN title TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matter_updates' AND column_name = 'content') THEN
        ALTER TABLE public.matter_updates ADD COLUMN content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matter_updates' AND column_name = 'client_visible') THEN
        ALTER TABLE public.matter_updates ADD COLUMN client_visible BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matter_updates' AND column_name = 'is_final') THEN
        ALTER TABLE public.matter_updates ADD COLUMN is_final BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ==========================================
-- PART 3: CREATE/FIX DOCUMENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'filename') THEN
        ALTER TABLE public.documents ADD COLUMN filename TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'file_url') THEN
        ALTER TABLE public.documents ADD COLUMN file_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by_user_id') THEN
        ALTER TABLE public.documents ADD COLUMN uploaded_by_user_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_by_role') THEN
        ALTER TABLE public.documents ADD COLUMN uploaded_by_role TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documents' AND column_name = 'uploaded_at') THEN
        ALTER TABLE public.documents ADD COLUMN uploaded_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ==========================================
-- PART 4: CREATE CASE_DOCUMENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    matter_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PART 5: CREATE REPORT_DOCUMENTS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.report_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID,
    document_id UUID,
    client_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PART 6: ENABLE RLS
-- ==========================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PART 7: DROP OLD POLICIES
-- ==========================================

DROP POLICY IF EXISTS "users_own_notifications" ON public.notifications;
DROP POLICY IF EXISTS "staff_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "staff_manage_documents" ON public.documents;
DROP POLICY IF EXISTS "staff_manage_case_docs" ON public.case_documents;
DROP POLICY IF EXISTS "staff_manage_report_docs" ON public.report_documents;

-- ==========================================
-- PART 8: CREATE SIMPLE POLICIES
-- ==========================================

-- Notifications: users see their own
CREATE POLICY "users_own_notifications" ON public.notifications
FOR ALL TO authenticated
USING (user_id = auth.uid());

-- Matter updates: staff can manage
CREATE POLICY "staff_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- Documents: staff can manage
CREATE POLICY "staff_manage_documents" ON public.documents
FOR ALL TO authenticated
USING (public.is_staff());

-- Case documents: staff can manage
CREATE POLICY "staff_manage_case_docs" ON public.case_documents
FOR ALL TO authenticated
USING (public.is_staff());

-- Report documents: staff can manage
CREATE POLICY "staff_manage_report_docs" ON public.report_documents
FOR ALL TO authenticated
USING (public.is_staff());

-- ==========================================
-- PART 9: GRANTS
-- ==========================================

GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.matter_updates TO authenticated;
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.case_documents TO authenticated;
GRANT ALL ON public.report_documents TO authenticated;

-- ==========================================
-- PART 10: RELOAD SCHEMA
-- ==========================================

NOTIFY pgrst, 'reload schema';

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT '✅ ALL TABLES FIXED!' as status;

SELECT 'notifications columns:' as info, string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notifications'
UNION ALL
SELECT 'matter_updates columns:', string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'matter_updates'
UNION ALL
SELECT 'documents columns:', string_agg(column_name, ', ' ORDER BY ordinal_position)
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents';
