-- ==========================================
-- COMPLETE MATTER_UPDATES TABLE RECREATION
-- ==========================================
-- This will ensure the table exists with correct schema

-- Check if table exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates'
    ) THEN
        -- Create table if it doesn't exist
        CREATE TABLE public.matter_updates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE,
            author_id UUID REFERENCES public.profiles(id),
            author_role TEXT,
            title TEXT NOT NULL,
            content TEXT,
            client_visible BOOLEAN DEFAULT TRUE,
            is_final BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'matter_updates table created';
    ELSE
        RAISE NOTICE 'matter_updates table already exists';
    END IF;
END $$;

-- Ensure all columns exist (in case table exists but is missing columns)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'matter_id') THEN
        ALTER TABLE public.matter_updates ADD COLUMN matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'author_id') THEN
        ALTER TABLE public.matter_updates ADD COLUMN author_id UUID REFERENCES public.profiles(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'author_role') THEN
        ALTER TABLE public.matter_updates ADD COLUMN author_role TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'title') THEN
        ALTER TABLE public.matter_updates ADD COLUMN title TEXT NOT NULL DEFAULT 'Progress Update';
        -- Remove default after adding
        ALTER TABLE public.matter_updates ALTER COLUMN title DROP DEFAULT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'content') THEN
        ALTER TABLE public.matter_updates ADD COLUMN content TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'client_visible') THEN
        ALTER TABLE public.matter_updates ADD COLUMN client_visible BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'is_final') THEN
        ALTER TABLE public.matter_updates ADD COLUMN is_final BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'matter_updates' AND column_name = 'created_at') THEN
        ALTER TABLE public.matter_updates ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.matter_updates ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "staff_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "admins_manage_updates" ON public.matter_updates;
DROP POLICY IF EXISTS "associates_manage_assigned_updates" ON public.matter_updates;

-- Simple policy: All staff can manage
CREATE POLICY "staff_manage_updates" ON public.matter_updates
FOR ALL TO authenticated
USING (public.is_staff())
WITH CHECK (public.is_staff());

-- Grant permissions
GRANT ALL ON public.matter_updates TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Show final structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'matter_updates'
ORDER BY ordinal_position;
