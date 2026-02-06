-- ==========================================
-- CHECK AND FIX matter_updates TABLE SCHEMA
-- ==========================================

-- First, let's see what columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'matter_updates'
ORDER BY ordinal_position;

-- Add any missing columns
DO $$ 
BEGIN
    -- Ensure matter_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'matter_id'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN matter_id UUID REFERENCES public.matters(id) ON DELETE CASCADE;
    END IF;

    -- Ensure author_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'author_id'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN author_id UUID REFERENCES public.profiles(id);
    END IF;

    -- Ensure author_role exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'author_role'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN author_role TEXT;
    END IF;

    -- Ensure title exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN title TEXT NOT NULL DEFAULT 'Progress Update';
    END IF;

    -- Ensure content exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'content'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN content TEXT;
    END IF;

    -- Ensure client_visible exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'client_visible'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN client_visible BOOLEAN DEFAULT TRUE;
    END IF;

    -- Ensure is_final exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'is_final'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN is_final BOOLEAN DEFAULT FALSE;
    END IF;

    -- Ensure created_at exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matter_updates' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.matter_updates 
        ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Show final structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'matter_updates'
ORDER BY ordinal_position;

SELECT '✅ matter_updates table schema verified and fixed!' as status;
