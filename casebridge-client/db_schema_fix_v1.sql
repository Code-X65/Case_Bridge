-- ========================================================
-- COMPREHENSIVE SCHEMA FIX V1
-- ========================================================

DO $$ 
BEGIN
    -- 1. FIX: Add 'created_by' to 'matters' table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='created_by') THEN
        ALTER TABLE public.matters ADD COLUMN created_by UUID REFERENCES auth.users(id);
        
        -- Default existing matters to a system admin or null if allowed
        -- For now, we leave it nullable or set to a known ID if possible.
    END IF;

    -- 2. FIX: Add 'priority' if missing (governance uses it)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='priority') THEN
        ALTER TABLE public.matters ADD COLUMN priority TEXT DEFAULT 'medium';
    END IF;

    -- 3. FIX: Create Notifications Table if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id),
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            link_path TEXT,
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can see own notifications') THEN
            CREATE POLICY "Users can see own notifications" ON public.notifications
            FOR SELECT USING (user_id = auth.uid());
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can update own notifications') THEN
            CREATE POLICY "Users can update own notifications" ON public.notifications
            FOR UPDATE USING (user_id = auth.uid());
        END IF;
    END IF;

END $$;

SELECT '✅ Schema Fixes Applied' as status;
