-- ==========================================
-- NOTIFICATION SYSTEM EXPANSION: SCHEMA v2.0
-- ==========================================

-- 1. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('matter_updates', 'billing', 'assignments', 'system')),
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- 2. NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS public.notification_templates (
    slug TEXT PRIMARY KEY,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    metadata_schema JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. NOTIFICATIONS MODIFICATIONS
-- Add archived_at support
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='archived_at') THEN
        ALTER TABLE public.notifications ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences (user_id);

-- 5. ENABLE RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES
-- Preferences: Users manage own
DROP POLICY IF EXISTS "Users manage own prefs" ON public.notification_preferences;
CREATE POLICY "Users manage own prefs" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Templates: Read-only for authenticated users (or service only)
-- For now, let's allow read for all authenticated so frontend can theoretically display context if needed, 
-- but primarily used by backend.
DROP POLICY IF EXISTS "Templates are readable by authenticated" ON public.notification_templates;
CREATE POLICY "Templates are readable by authenticated" ON public.notification_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- 7. INITIAL TEMPLATES (Example)
INSERT INTO public.notification_templates (slug, subject_template, body_template)
VALUES 
('matter_assigned_email_v1', 'New Matter Assignment: {{title}}', 'Hello {{full_name}}, you have been assigned to a new matter: {{title}}. View it here: {{link}}'),
('billing_invoice_ready_v1', 'Institutional Invoice Ready: {{invoice_id}}', 'An invoice for matter {{title}} is ready for review.')
ON CONFLICT (slug) DO NOTHING;

-- 8. TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

SELECT '✅ Notification Schema v2.0 Applied' AS status;
