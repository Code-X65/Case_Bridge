-- ==========================================
-- PHASE 11: INTEGRATED LEGAL CALENDAR (DEADLINES)
-- ==========================================

-- 1. Create Matter Deadlines Table
CREATE TABLE IF NOT EXISTS public.matter_deadlines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matter_id UUID NOT NULL REFERENCES public.matters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    deadline_date TIMESTAMPTZ NOT NULL,
    priority TEXT NOT NULL DEFAULT 'standard' CHECK (priority IN ('standard', 'critical', 'emergency')),
    category TEXT NOT NULL DEFAULT 'internal' CHECK (category IN ('internal', 'court-ordered', 'statutory', 'filing')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'missed', 'cancelled')),
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Audit Log for Deadlines
CREATE OR REPLACE FUNCTION public.log_deadline_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (action, target_id, actor_id, firm_id, metadata)
        VALUES (
            'deadline_created',
            NEW.id,
            auth.uid(),
            (SELECT firm_id FROM public.matters WHERE id = NEW.matter_id),
            jsonb_build_object('title', NEW.title, 'matter_id', NEW.matter_id, 'deadline_date', NEW.deadline_date)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status <> NEW.status THEN
            INSERT INTO public.audit_logs (action, target_id, actor_id, firm_id, metadata)
            VALUES (
                'deadline_status_updated',
                NEW.id,
                auth.uid(),
                (SELECT firm_id FROM public.matters WHERE id = NEW.matter_id),
                jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status, 'title', NEW.title)
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_log_deadline_changes
AFTER INSERT OR UPDATE ON public.matter_deadlines
FOR EACH ROW EXECUTE FUNCTION public.log_deadline_changes();

-- 3. RLS Policies
ALTER TABLE public.matter_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "firm_access_deadlines" ON public.matter_deadlines;
CREATE POLICY "firm_access_deadlines" ON public.matter_deadlines
FOR ALL TO authenticated USING (
    matter_id IN (
        SELECT id FROM public.matters 
        WHERE firm_id IN (SELECT firm_id FROM public.user_firm_roles WHERE user_id = auth.uid() AND status = 'active')
    )
);

-- 4. Real-time Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'matter_deadlines'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.matter_deadlines;
    END IF;
END $$;

SELECT '✅ Matter Deadlines schema initialized and Realtime enabled.' AS status;
