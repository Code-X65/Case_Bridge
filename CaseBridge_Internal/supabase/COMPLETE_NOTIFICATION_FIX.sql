-- ==========================================
-- COMPLETE NOTIFICATIONS FIX
-- Adds ALL possible columns and fixes function
-- ==========================================

-- STEP 1: Add every single column that might be needed
DO $$ 
BEGIN
    -- firm_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'firm_id') THEN
        ALTER TABLE public.notifications ADD COLUMN firm_id UUID;
    END IF;
    
    -- user_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_id') THEN
        ALTER TABLE public.notifications ADD COLUMN user_id UUID;
    END IF;
    
    -- type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'type') THEN
        ALTER TABLE public.notifications ADD COLUMN type TEXT;
    END IF;
    
    -- event_type (alternative name)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'event_type') THEN
        ALTER TABLE public.notifications ADD COLUMN event_type TEXT;
    END IF;
    
    -- title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'title') THEN
        ALTER TABLE public.notifications ADD COLUMN title TEXT;
    END IF;
    
    -- message
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'message') THEN
        ALTER TABLE public.notifications ADD COLUMN message TEXT;
    END IF;
    
    -- link_path
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'link_path') THEN
        ALTER TABLE public.notifications ADD COLUMN link_path TEXT;
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
    
    -- read (alternative name)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read') THEN
        ALTER TABLE public.notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- created_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'created_at') THEN
        ALTER TABLE public.notifications ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- STEP 2: Create a flexible notification function that works with any schema
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_case_id UUID DEFAULT NULL,
    p_report_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
    user_firm_id UUID;
    has_firm_id BOOLEAN;
    has_type BOOLEAN;
    has_event_type BOOLEAN;
    has_title BOOLEAN;
    has_message BOOLEAN;
    has_link_path BOOLEAN;
    has_related_case_id BOOLEAN;
    has_related_report_id BOOLEAN;
    has_metadata BOOLEAN;
    has_is_read BOOLEAN;
    has_read BOOLEAN;
BEGIN
    -- Get user's firm_id
    SELECT firm_id INTO user_firm_id
    FROM public.user_firm_roles
    WHERE user_id = p_user_id AND status = 'active'
    LIMIT 1;
    
    IF user_firm_id IS NULL THEN
        SELECT firm_id INTO user_firm_id
        FROM public.profiles
        WHERE id = p_user_id;
    END IF;
    
    -- Check which columns exist
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'firm_id') INTO has_firm_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') INTO has_type;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'event_type') INTO has_event_type;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'title') INTO has_title;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') INTO has_message;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link_path') INTO has_link_path;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_case_id') INTO has_related_case_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_report_id') INTO has_related_report_id;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'metadata') INTO has_metadata;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') INTO has_is_read;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') INTO has_read;
    
    -- Build and execute dynamic INSERT based on available columns
    EXECUTE format(
        'INSERT INTO public.notifications (%s) VALUES (%s) RETURNING id',
        (
            SELECT string_agg(col, ', ')
            FROM (
                SELECT 'user_id' AS col
                UNION ALL SELECT 'firm_id' WHERE has_firm_id AND user_firm_id IS NOT NULL
                UNION ALL SELECT 'type' WHERE has_type
                UNION ALL SELECT 'event_type' WHERE has_event_type
                UNION ALL SELECT 'title' WHERE has_title
                UNION ALL SELECT 'message' WHERE has_message
                UNION ALL SELECT 'link_path' WHERE has_link_path
                UNION ALL SELECT 'related_case_id' WHERE has_related_case_id
                UNION ALL SELECT 'related_report_id' WHERE has_related_report_id
                UNION ALL SELECT 'metadata' WHERE has_metadata
                UNION ALL SELECT 'is_read' WHERE has_is_read
                UNION ALL SELECT 'read' WHERE has_read
            ) cols
        ),
        (
            SELECT string_agg(val, ', ')
            FROM (
                SELECT '$1' AS val
                UNION ALL SELECT '$2' WHERE has_firm_id AND user_firm_id IS NOT NULL
                UNION ALL SELECT '$3' WHERE has_type
                UNION ALL SELECT '$3' WHERE has_event_type
                UNION ALL SELECT '$4' WHERE has_title
                UNION ALL SELECT '$5' WHERE has_message
                UNION ALL SELECT 'NULL' WHERE has_link_path
                UNION ALL SELECT '$6' WHERE has_related_case_id
                UNION ALL SELECT '$7' WHERE has_related_report_id
                UNION ALL SELECT '$8' WHERE has_metadata
                UNION ALL SELECT 'FALSE' WHERE has_is_read
                UNION ALL SELECT 'FALSE' WHERE has_read
            ) vals
        )
    )
    USING p_user_id, user_firm_id, p_type, p_title, p_message, p_case_id, p_report_id, p_metadata
    INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Show what columns now exist
SELECT 
    'notifications table now has these columns:' as info,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notifications';
