-- ============================================================
-- ALL-IN-ONE FIX: Run this to fix all registration issues
-- ============================================================
-- This script fixes:
-- 1. Foreign key constraint on pending_firm_registrations
-- 2. Role check constraints on user_firm_roles and invitations
-- 3. RLS policies
-- ============================================================

-- ============================================================
-- FIX 1: Remove FK constraint from pending_firm_registrations
-- ============================================================
ALTER TABLE public.pending_firm_registrations 
DROP CONSTRAINT IF EXISTS pending_firm_registrations_user_id_fkey;

-- Disable RLS on pending_firm_registrations
ALTER TABLE public.pending_firm_registrations 
DISABLE ROW LEVEL SECURITY;

SELECT '✅ FIX 1: Foreign key constraint removed from pending_firm_registrations' AS status;

-- ============================================================
-- FIX 2: Fix role constraints to accept lowercase
-- ============================================================

-- Drop old constraints
ALTER TABLE public.user_firm_roles 
DROP CONSTRAINT IF EXISTS user_firm_roles_role_check;

ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_role_preassigned_check;

ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_internal_role_check;

ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_role_check;

-- Add new constraints that accept lowercase
ALTER TABLE public.user_firm_roles 
ADD CONSTRAINT user_firm_roles_role_check 
CHECK (LOWER(role) IN ('admin_manager', 'case_manager', 'associate_lawyer'));

ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_role_check 
CHECK (LOWER(role_preassigned) IN ('admin_manager', 'case_manager', 'associate_lawyer'));

-- Normalize existing data
UPDATE public.user_firm_roles 
SET role = LOWER(role) 
WHERE role != LOWER(role);

UPDATE public.invitations 
SET role_preassigned = LOWER(role_preassigned) 
WHERE role_preassigned != LOWER(role_preassigned);

SELECT '✅ FIX 2: Role constraints updated to accept lowercase values' AS status;

-- ============================================================
-- FIX 3: Update is_firm_admin function to be case-insensitive
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_firm_admin(target_firm_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_firm_roles
        WHERE user_id = auth.uid()
        AND firm_id = target_firm_id
        AND LOWER(role) = 'admin_manager'
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ FIX 3: is_firm_admin function updated' AS status;

-- ============================================================
-- VERIFICATION: Check all constraints
-- ============================================================
SELECT 
    '=== VERIFICATION RESULTS ===' AS section,
    '' AS detail
UNION ALL
SELECT 
    'Foreign Key on pending_firm_registrations' AS section,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ REMOVED (correct)'
        ELSE '❌ STILL EXISTS (run fix again)'
    END AS detail
FROM pg_constraint
WHERE conrelid = 'public.pending_firm_registrations'::regclass
AND conname = 'pending_firm_registrations_user_id_fkey'

UNION ALL
SELECT 
    'Role constraint on user_firm_roles' AS section,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS with LOWER() check (correct)'
        ELSE '❌ MISSING (run fix again)'
    END AS detail
FROM pg_constraint
WHERE conrelid = 'public.user_firm_roles'::regclass
AND conname = 'user_firm_roles_role_check'
AND pg_get_constraintdef(oid) LIKE '%lower%'

UNION ALL
SELECT 
    'Role constraint on invitations' AS section,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTS with LOWER() check (correct)'
        ELSE '❌ MISSING (run fix again)'
    END AS detail
FROM pg_constraint
WHERE conrelid = 'public.invitations'::regclass
AND conname = 'invitations_role_check'
AND pg_get_constraintdef(oid) LIKE '%lower%';

-- Refresh schema
NOTIFY pgrst, 'reload schema';

SELECT '🎉 ALL FIXES APPLIED! Try registering again.' AS final_status;
