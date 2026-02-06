-- ==========================================
-- CLIENT VAULT COMPLETE FIX
-- Allows clients to upload documents to their personal vault
-- ==========================================

-- Step 1: Create client_profiles table
CREATE TABLE IF NOT EXISTS public.client_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add missing columns to client_profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = 'firm_id') THEN
        ALTER TABLE public.client_profiles ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = 'email') THEN
        ALTER TABLE public.client_profiles ADD COLUMN email TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.client_profiles ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.client_profiles ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_profiles' AND column_name = 'phone') THEN
        ALTER TABLE public.client_profiles ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Step 3: Create client_documents table (vault storage)
CREATE TABLE IF NOT EXISTS public.client_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    firm_id UUID,
    matter_id UUID,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type TEXT,
    category TEXT DEFAULT 'General',
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Add missing columns to client_documents
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'client_id') THEN
        ALTER TABLE public.client_documents ADD COLUMN client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'firm_id') THEN
        ALTER TABLE public.client_documents ADD COLUMN firm_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'matter_id') THEN
        ALTER TABLE public.client_documents ADD COLUMN matter_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'file_name') THEN
        ALTER TABLE public.client_documents ADD COLUMN file_name TEXT NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'file_url') THEN
        ALTER TABLE public.client_documents ADD COLUMN file_url TEXT NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'file_size') THEN
        ALTER TABLE public.client_documents ADD COLUMN file_size BIGINT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'file_type') THEN
        ALTER TABLE public.client_documents ADD COLUMN file_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'category') THEN
        ALTER TABLE public.client_documents ADD COLUMN category TEXT DEFAULT 'General';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'client_documents' AND column_name = 'uploaded_at') THEN
        ALTER TABLE public.client_documents ADD COLUMN uploaded_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 5: Enable RLS
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop existing policies
DROP POLICY IF EXISTS "client_view_own_profile" ON public.client_profiles;
DROP POLICY IF EXISTS "client_update_own_profile" ON public.client_profiles;
DROP POLICY IF EXISTS "client_insert_own_profile" ON public.client_profiles;
DROP POLICY IF EXISTS "client_view_own_documents" ON public.client_documents;
DROP POLICY IF EXISTS "client_insert_own_documents" ON public.client_documents;
DROP POLICY IF EXISTS "client_update_own_documents" ON public.client_documents;
DROP POLICY IF EXISTS "client_delete_own_documents" ON public.client_documents;

-- Step 7: Create RLS policies for client_profiles
-- Allow clients to view their own profile
CREATE POLICY "client_view_own_profile" ON public.client_profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Allow clients to update their own profile
CREATE POLICY "client_update_own_profile" ON public.client_profiles
FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Allow clients to insert their own profile
CREATE POLICY "client_insert_own_profile" ON public.client_profiles
FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- Step 8: Create RLS policies for client_documents
-- Allow clients to view their own documents
CREATE POLICY "client_view_own_documents" ON public.client_documents
FOR SELECT TO authenticated
USING (client_id = auth.uid());

-- Allow clients to insert their own documents
CREATE POLICY "client_insert_own_documents" ON public.client_documents
FOR INSERT TO authenticated
WITH CHECK (client_id = auth.uid());

-- Allow clients to update their own documents
CREATE POLICY "client_update_own_documents" ON public.client_documents
FOR UPDATE TO authenticated
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

-- Allow clients to delete their own documents
CREATE POLICY "client_delete_own_documents" ON public.client_documents
FOR DELETE TO authenticated
USING (client_id = auth.uid());

-- Step 9: Grant permissions
GRANT ALL ON public.client_profiles TO authenticated;
GRANT ALL ON public.client_documents TO authenticated;

-- Step 10: Reload schema
NOTIFY pgrst, 'reload schema';

-- Step 11: Verification
SELECT 
    '✅ CLIENT VAULT SETUP COMPLETE' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_profiles') as client_profiles_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'client_documents') as client_documents_exists,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'client_profiles') as client_profile_policies,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'client_documents') as client_document_policies;
