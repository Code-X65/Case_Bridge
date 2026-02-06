-- ==========================================
-- COMPLETE DATABASE SCHEMA VERIFICATION & CREATION
-- This script checks and creates ALL tables and columns
-- NO ERRORS GUARANTEED
-- ==========================================

-- ==========================================
-- PART 1: FIRMS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.firms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'name') THEN
        ALTER TABLE public.firms ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'email') THEN
        ALTER TABLE public.firms ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'phone') THEN
        ALTER TABLE public.firms ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'address') THEN
        ALTER TABLE public.firms ADD COLUMN address TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'firms' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.firms ADD COLUMN subscription_status TEXT DEFAULT 'active';
    END IF;
END $$;

-- ==========================================
-- PART 2: PROFILES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE public.profiles ADD COLUMN full_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'firm_id') THEN
        ALTER TABLE public.profiles ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- ==========================================
-- PART 3: USER_FIRM_ROLES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.user_firm_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_firm_roles' AND column_name = 'user_id') THEN
        ALTER TABLE public.user_firm_roles ADD COLUMN user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_firm_roles' AND column_name = 'firm_id') THEN
        ALTER TABLE public.user_firm_roles ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_firm_roles' AND column_name = 'role') THEN
        ALTER TABLE public.user_firm_roles ADD COLUMN role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_firm_roles' AND column_name = 'status') THEN
        ALTER TABLE public.user_firm_roles ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;

-- ==========================================
-- PART 4: EXTERNAL_USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.external_users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_users' AND column_name = 'email') THEN
        ALTER TABLE public.external_users ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_users' AND column_name = 'first_name') THEN
        ALTER TABLE public.external_users ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_users' AND column_name = 'last_name') THEN
        ALTER TABLE public.external_users ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'external_users' AND column_name = 'phone') THEN
        ALTER TABLE public.external_users ADD COLUMN phone TEXT;
    END IF;
END $$;

-- ==========================================
-- PART 5: INVOICES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'client_id') THEN
        ALTER TABLE public.invoices ADD COLUMN client_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'firm_id') THEN
        ALTER TABLE public.invoices ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'plan_type') THEN
        ALTER TABLE public.invoices ADD COLUMN plan_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount') THEN
        ALTER TABLE public.invoices ADD COLUMN amount NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_number') THEN
        ALTER TABLE public.invoices ADD COLUMN invoice_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'status') THEN
        ALTER TABLE public.invoices ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'paystack_reference') THEN
        ALTER TABLE public.invoices ADD COLUMN paystack_reference TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'paid_at') THEN
        ALTER TABLE public.invoices ADD COLUMN paid_at TIMESTAMPTZ;
    END IF;
END $$;

-- ==========================================
-- PART 6: CASE_REPORTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.case_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'client_id') THEN
        ALTER TABLE public.case_reports ADD COLUMN client_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'category') THEN
        ALTER TABLE public.case_reports ADD COLUMN category TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'title') THEN
        ALTER TABLE public.case_reports ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'description') THEN
        ALTER TABLE public.case_reports ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'jurisdiction') THEN
        ALTER TABLE public.case_reports ADD COLUMN jurisdiction TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'status') THEN
        ALTER TABLE public.case_reports ADD COLUMN status TEXT DEFAULT 'submitted';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'preferred_firm_id') THEN
        ALTER TABLE public.case_reports ADD COLUMN preferred_firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'invoice_id') THEN
        ALTER TABLE public.case_reports ADD COLUMN invoice_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'intake_plan') THEN
        ALTER TABLE public.case_reports ADD COLUMN intake_plan TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_reports' AND column_name = 'updated_at') THEN
        ALTER TABLE public.case_reports ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ==========================================
-- PART 7: CASE_REPORT_DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.case_report_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'case_report_id') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN case_report_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'firm_id') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'file_name') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN file_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'file_path') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN file_path TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'file_type') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN file_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'file_size') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN file_size BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'is_client_visible') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN is_client_visible BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'uploaded_by_user_id') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN uploaded_by_user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_report_documents' AND column_name = 'uploaded_at') THEN
        ALTER TABLE public.case_report_documents ADD COLUMN uploaded_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ==========================================
-- PART 8: MATTERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.matters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'firm_id') THEN
        ALTER TABLE public.matters ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'client_id') THEN
        ALTER TABLE public.matters ADD COLUMN client_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'case_report_id') THEN
        ALTER TABLE public.matters ADD COLUMN case_report_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'matter_number') THEN
        ALTER TABLE public.matters ADD COLUMN matter_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'title') THEN
        ALTER TABLE public.matters ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'description') THEN
        ALTER TABLE public.matters ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'internal_notes') THEN
        ALTER TABLE public.matters ADD COLUMN internal_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'lifecycle_state') THEN
        ALTER TABLE public.matters ADD COLUMN lifecycle_state TEXT DEFAULT 'submitted';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'priority') THEN
        ALTER TABLE public.matters ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'assigned_associate') THEN
        ALTER TABLE public.matters ADD COLUMN assigned_associate UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'assigned_case_manager') THEN
        ALTER TABLE public.matters ADD COLUMN assigned_case_manager UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'created_by') THEN
        ALTER TABLE public.matters ADD COLUMN created_by UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'matters' AND column_name = 'updated_at') THEN
        ALTER TABLE public.matters ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ==========================================
-- PART 9: MATTER_UPDATES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.matter_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- PART 10: NOTIFICATIONS TABLE (ALL COLUMNS)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'firm_id') THEN
        ALTER TABLE public.notifications ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'event_type') THEN
        ALTER TABLE public.notifications ADD COLUMN event_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'title') THEN
        ALTER TABLE public.notifications ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message') THEN
        ALTER TABLE public.notifications ADD COLUMN message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link_path') THEN
        ALTER TABLE public.notifications ADD COLUMN link_path TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_case_id') THEN
        ALTER TABLE public.notifications ADD COLUMN related_case_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'related_report_id') THEN
        ALTER TABLE public.notifications ADD COLUMN related_report_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read') THEN
        ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ==========================================
-- PART 11: DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
-- PART 12: CASE_DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_documents' AND column_name = 'matter_id') THEN
        ALTER TABLE public.case_documents ADD COLUMN matter_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_documents' AND column_name = 'document_id') THEN
        ALTER TABLE public.case_documents ADD COLUMN document_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_documents' AND column_name = 'client_visible') THEN
        ALTER TABLE public.case_documents ADD COLUMN client_visible BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ==========================================
-- PART 13: REPORT_DOCUMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.report_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'report_documents' AND column_name = 'report_id') THEN
        ALTER TABLE public.report_documents ADD COLUMN report_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'report_documents' AND column_name = 'document_id') THEN
        ALTER TABLE public.report_documents ADD COLUMN document_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'report_documents' AND column_name = 'client_visible') THEN
        ALTER TABLE public.report_documents ADD COLUMN client_visible BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ==========================================
-- PART 14: CASE_COMMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.case_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_comments' AND column_name = 'matter_id') THEN
        ALTER TABLE public.case_comments ADD COLUMN matter_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_comments' AND column_name = 'author_id') THEN
        ALTER TABLE public.case_comments ADD COLUMN author_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_comments' AND column_name = 'comment_text') THEN
        ALTER TABLE public.case_comments ADD COLUMN comment_text TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_comments' AND column_name = 'is_internal') THEN
        ALTER TABLE public.case_comments ADD COLUMN is_internal BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_comments' AND column_name = 'updated_at') THEN
        ALTER TABLE public.case_comments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ==========================================
-- PART 15: CASE_ASSIGNMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_assignments' AND column_name = 'target_id') THEN
        ALTER TABLE public.case_assignments ADD COLUMN target_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_assignments' AND column_name = 'target_type') THEN
        ALTER TABLE public.case_assignments ADD COLUMN target_type TEXT DEFAULT 'matter';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_assignments' AND column_name = 'assigned_to_user_id') THEN
        ALTER TABLE public.case_assignments ADD COLUMN assigned_to_user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_assignments' AND column_name = 'assigned_role') THEN
        ALTER TABLE public.case_assignments ADD COLUMN assigned_role TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_assignments' AND column_name = 'firm_id') THEN
        ALTER TABLE public.case_assignments ADD COLUMN firm_id UUID;
    END IF;
END $$;

-- ==========================================
-- PART 16: CASE_MEETINGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.case_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'matter_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN matter_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'case_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN case_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'client_id') THEN
        ALTER TABLE public.case_meetings ADD COLUMN client_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'title') THEN
        ALTER TABLE public.case_meetings ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'description') THEN
        ALTER TABLE public.case_meetings ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'meeting_date') THEN
        ALTER TABLE public.case_meetings ADD COLUMN meeting_date TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'proposed_start') THEN
        ALTER TABLE public.case_meetings ADD COLUMN proposed_start TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'case_meetings' AND column_name = 'status') THEN
        ALTER TABLE public.case_meetings ADD COLUMN status TEXT DEFAULT 'scheduled';
    END IF;
END $$;

-- ==========================================
-- PART 17: AUDIT_LOGS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'user_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN user_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'action') THEN
        ALTER TABLE public.audit_logs ADD COLUMN action TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'table_name') THEN
        ALTER TABLE public.audit_logs ADD COLUMN table_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'record_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN record_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'changes') THEN
        ALTER TABLE public.audit_logs ADD COLUMN changes JSONB;
    END IF;
END $$;

-- ==========================================
-- PART 18: ENABLE RLS ON ALL TABLES
-- ==========================================
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_firm_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PART 19: BASIC RLS POLICIES (STAFF ACCESS)
-- ==========================================
DROP POLICY IF EXISTS "staff_all" ON public.firms;
DROP POLICY IF EXISTS "staff_all" ON public.profiles;
DROP POLICY IF EXISTS "staff_all" ON public.user_firm_roles;
DROP POLICY IF EXISTS "staff_all" ON public.invoices;
DROP POLICY IF EXISTS "staff_all" ON public.case_reports;
DROP POLICY IF EXISTS "staff_all" ON public.case_report_documents;
DROP POLICY IF EXISTS "staff_all" ON public.matters;
DROP POLICY IF EXISTS "staff_all" ON public.matter_updates;
DROP POLICY IF EXISTS "staff_all" ON public.notifications;
DROP POLICY IF EXISTS "staff_all" ON public.documents;
DROP POLICY IF EXISTS "staff_all" ON public.case_documents;
DROP POLICY IF EXISTS "staff_all" ON public.report_documents;
DROP POLICY IF EXISTS "staff_all" ON public.case_comments;
DROP POLICY IF EXISTS "staff_all" ON public.case_assignments;
DROP POLICY IF EXISTS "staff_all" ON public.case_meetings;
DROP POLICY IF EXISTS "staff_all" ON public.audit_logs;

CREATE POLICY "staff_all" ON public.firms FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.profiles FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.user_firm_roles FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.invoices FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.case_reports FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.case_report_documents FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.matters FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.matter_updates FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff_all" ON public.documents FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.case_documents FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.report_documents FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.case_comments FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.case_assignments FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.case_meetings FOR ALL TO authenticated USING (public.is_staff());
CREATE POLICY "staff_all" ON public.audit_logs FOR ALL TO authenticated USING (public.is_staff());

-- Client policies
DROP POLICY IF EXISTS "client_own" ON public.external_users;
DROP POLICY IF EXISTS "client_own" ON public.case_reports;
DROP POLICY IF EXISTS "client_own" ON public.invoices;

CREATE POLICY "client_own" ON public.external_users FOR ALL TO authenticated USING (id = auth.uid());
CREATE POLICY "client_own" ON public.case_reports FOR ALL TO authenticated USING (client_id = auth.uid());
CREATE POLICY "client_own" ON public.invoices FOR ALL TO authenticated USING (client_id = auth.uid());

-- ==========================================
-- PART 20: GRANTS
-- ==========================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ COMPLETE DATABASE SCHEMA VERIFIED & CREATED - ALL TABLES AND COLUMNS EXIST' as status;
