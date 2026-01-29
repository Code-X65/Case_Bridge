-- ==========================================================
-- FIX DUPLICATE FIRMS & PENDING REGISTRATIONS
-- ==========================================================
-- This script will:
-- 1. Remove duplicate firms (keeping the oldest one).
-- 2. Add a unique constraint to firms(email) to prevent future duplicates.
-- 3. Remove duplicate pending registrations.
-- 4. Add a unique constraint to pending_firm_registrations(user_id).
-- ==========================================================

-- 1. DEDUPLICATE FIRMS (Keep the first one created)
DELETE FROM public.firms
WHERE id IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER (partition BY email ORDER BY created_at ASC) as rnum
        FROM public.firms
        WHERE email IS NOT NULL
    ) t
    WHERE t.rnum > 1
);

-- 2. ADD UNIQUE CONSTRAINT ON FIRM EMAIL
-- Check if constraint exists effectively or just add it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'firms_email_unique'
    ) THEN
        ALTER TABLE public.firms ADD CONSTRAINT firms_email_unique UNIQUE (email);
    END IF;
END $$;


-- 3. DEDUPLICATE PENDING REGISTRATIONS
DELETE FROM public.pending_firm_registrations
WHERE id IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER (partition BY user_id ORDER BY created_at ASC) as rnum
        FROM public.pending_firm_registrations
        WHERE user_id IS NOT NULL
    ) t
    WHERE t.rnum > 1
);

-- 4. ADD UNIQUE CONSTRAINT ON PENDING REGISTRATIONS USER_ID
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'pending_reg_user_id_unique'
    ) THEN
        ALTER TABLE public.pending_firm_registrations ADD CONSTRAINT pending_reg_user_id_unique UNIQUE (user_id);
    END IF;
END $$;

SELECT '✅ Duplicates removed and constraints applied.' as status;
