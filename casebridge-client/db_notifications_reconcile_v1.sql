-- ========================================================
-- NOTIFICATIONS SCHEMA RECONCILIATION (Engine v1)
-- ========================================================

DO $$ 
BEGIN
    -- 1. Ensure the table exists with the CORRECT authoritative structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='notifications') THEN
        CREATE TABLE public.notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            event_type TEXT NOT NULL,
            channel TEXT NOT NULL,
            payload JSONB NOT NULL DEFAULT '{}'::jsonb,
            sent_at TIMESTAMPTZ DEFAULT NOW(),
            read_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    ELSE
        -- 2. Table exists, check for missing columns from the new spec
        
        -- Add 'channel' if missing (THIS IS THE CAUSE OF THE 400 ERROR)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='channel') THEN
            ALTER TABLE public.notifications ADD COLUMN channel TEXT DEFAULT 'in_app';
        END IF;

        -- Add 'event_type' and migrate 'type' if it exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='event_type') THEN
            ALTER TABLE public.notifications ADD COLUMN event_type TEXT;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
                UPDATE public.notifications SET event_type = "type";
                ALTER TABLE public.notifications DROP COLUMN "type";
            ELSE
                UPDATE public.notifications SET event_type = 'system_legacy';
            END IF;
            ALTER TABLE public.notifications ALTER COLUMN event_type SET NOT NULL;
        END IF;

        -- Add 'payload' and migrate 'message'/'link_path'
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='payload') THEN
            ALTER TABLE public.notifications ADD COLUMN payload JSONB DEFAULT '{}'::jsonb;
            
            -- Migrate legacy message/link if they exist
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='message') THEN
                UPDATE public.notifications SET payload = jsonb_build_object(
                    'title', 'Legacy Notification',
                    'message', message,
                    'link', coalesce(link_path, '')
                );
                ALTER TABLE public.notifications DROP COLUMN message;
                ALTER TABLE public.notifications DROP COLUMN link_path;
            END IF;
            
            ALTER TABLE public.notifications ALTER COLUMN payload SET NOT NULL;
        END IF;

        -- Add 'read_at' and migrate 'read' boolean
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read_at') THEN
            ALTER TABLE public.notifications ADD COLUMN read_at TIMESTAMPTZ;
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read') THEN
                UPDATE public.notifications SET read_at = NOW() WHERE "read" = TRUE;
                ALTER TABLE public.notifications DROP COLUMN "read";
            END IF;
        END IF;

        -- Add 'sent_at'
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='sent_at') THEN
            ALTER TABLE public.notifications ADD COLUMN sent_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        -- Ensure firm_id is present (Engine logic uses it for scoping)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='firm_id') THEN
            ALTER TABLE public.notifications ADD COLUMN firm_id UUID REFERENCES public.firms(id);
        END IF;

    END IF;

    -- 3. Update Constraints
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_channel_check CHECK (channel IN ('email', 'in_app'));

END $$;

-- 4. Re-enable RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
USING (user_id = auth.uid());

-- 5. Refresh PostgREST Cache
NOTIFY pgrst, 'reload';

SELECT '✅ Notifications schema successfully reconciled and data migrated.' as status;
