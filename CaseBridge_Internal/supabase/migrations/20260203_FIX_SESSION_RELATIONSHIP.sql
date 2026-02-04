-- ==========================================
-- FIX INTERNAL SESSIONS RELATIONSHIP
-- ==========================================

-- PostgREST needs an explicit foreign key to public.profiles to enable joined selects.
-- Currently user_id references auth.users(id).

ALTER TABLE public.internal_sessions 
DROP CONSTRAINT IF EXISTS internal_sessions_user_id_fkey;

ALTER TABLE public.internal_sessions 
ADD CONSTRAINT internal_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Ensure indices for performance
CREATE INDEX IF NOT EXISTS idx_internal_sessions_user_id ON public.internal_sessions(user_id);

SELECT '✅ Internal Sessions relationship updated to reference Profiles.' AS status;
