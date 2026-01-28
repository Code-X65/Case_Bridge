-- ========================================================
-- AUTHORITATIVE SCHEMA FIX: Matters & Notifications
-- ========================================================

DO $$ 
BEGIN
    -- 1. FIX MATTERS TABLE
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='matters') THEN
        -- Add created_by if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='created_by') THEN
            ALTER TABLE public.matters ADD COLUMN created_by UUID REFERENCES auth.users(id);
        END IF;

        -- Ensure lifecycle_state exists (use TEXT if type is missing or problematic, but let's try to match enum)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='lifecycle_state') THEN
            ALTER TABLE public.matters ADD COLUMN lifecycle_state TEXT DEFAULT 'submitted';
        END IF;

        -- Ensure firm_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='matters' AND column_name='firm_id') THEN
            ALTER TABLE public.matters ADD COLUMN firm_id UUID REFERENCES public.firms(id);
        END IF;
    END IF;

    -- 2. FIX NOTIFICATIONS TABLE (Align with 20260128_002_NOTIFICATIONS_SYSTEM)
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
        CREATE TABLE public.notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            firm_id UUID REFERENCES public.firms(id), 
            user_id UUID REFERENCES auth.users(id) NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            link_path TEXT,
            read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

        -- Policies
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users view own notifications') THEN
            CREATE POLICY "Users view own notifications" ON public.notifications
            FOR SELECT USING (user_id = auth.uid());
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users update own notifications') THEN
            CREATE POLICY "Users update own notifications" ON public.notifications
            FOR UPDATE USING (user_id = auth.uid());
        END IF;
    END IF;

END $$;

SELECT '✅ Authoritative Schema Fix Applied' as status;
