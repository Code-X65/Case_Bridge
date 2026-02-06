-- ==========================================
-- FIX: Update create_notification to match ACTUAL schema
-- ==========================================

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
BEGIN
    -- Get the user's firm_id from user_firm_roles
    SELECT firm_id INTO user_firm_id
    FROM public.user_firm_roles
    WHERE user_id = p_user_id
    AND status = 'active'
    LIMIT 1;
    
    -- If no firm found, try to get from profiles
    IF user_firm_id IS NULL THEN
        SELECT firm_id INTO user_firm_id
        FROM public.profiles
        WHERE id = p_user_id;
    END IF;
    
    -- Insert notification with the ACTUAL schema columns
    INSERT INTO public.notifications (
        firm_id,      -- REQUIRED
        user_id,      -- REQUIRED
        type,         -- REQUIRED
        message,      -- REQUIRED (using p_title + p_message combined)
        link_path,    -- Optional
        read          -- Default FALSE
    )
    VALUES (
        user_firm_id,
        p_user_id,
        p_type,
        COALESCE(p_title || ': ', '') || p_message,  -- Combine title and message
        NULL,  -- We don't have link_path in the function params
        FALSE
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

NOTIFY pgrst, 'reload schema';

SELECT '✅ create_notification function fixed to match actual notifications table schema' as status;
