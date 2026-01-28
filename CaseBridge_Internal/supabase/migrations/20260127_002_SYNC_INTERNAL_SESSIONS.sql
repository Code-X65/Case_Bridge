-- ==========================================
-- INTERNAL SESSIONS SCHEMA SYNC
-- ==========================================

-- 1. Add missing columns to internal_sessions table
ALTER TABLE public.internal_sessions ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE public.internal_sessions ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Update existing rows if any (optional but good practice)
UPDATE public.internal_sessions 
SET issued_at = created_at 
WHERE issued_at IS NULL AND created_at IS NOT NULL;

-- 3. Add index for performance on session lookups
CREATE INDEX IF NOT EXISTS idx_internal_sessions_user_id ON public.internal_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_sessions_token ON public.internal_sessions(token);

-- 4. RLS Policies for internal_sessions
ALTER TABLE public.internal_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own internal sessions" ON public.internal_sessions;
CREATE POLICY "Users can manage their own internal sessions" ON public.internal_sessions
    FOR ALL USING (auth.uid() = user_id);

SELECT '✅ Internal sessions table synced with frontend requirements and RLS applied.' AS status;
