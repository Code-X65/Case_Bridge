    -- ============================================================
-- QUICK FIX: Remove and recreate role constraints
-- ============================================================
-- Run this immediately to fix the role constraint issue
-- ============================================================

-- 1. Drop the problematic constraint on user_firm_roles
ALTER TABLE public.user_firm_roles 
DROP CONSTRAINT IF EXISTS user_firm_roles_role_check;

-- 2. Add the correct constraint that accepts lowercase roles
ALTER TABLE public.user_firm_roles 
ADD CONSTRAINT user_firm_roles_role_check 
CHECK (LOWER(role) IN ('admin_manager', 'case_manager', 'associate_lawyer'));

-- 3. Also fix invitations table
ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_role_preassigned_check;

ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_internal_role_check;

ALTER TABLE public.invitations 
DROP CONSTRAINT IF EXISTS invitations_role_check;

-- Add the correct constraint
ALTER TABLE public.invitations 
ADD CONSTRAINT invitations_role_check 
CHECK (LOWER(role_preassigned) IN ('admin_manager', 'case_manager', 'associate_lawyer'));

-- 4. Normalize any existing data to lowercase
UPDATE public.user_firm_roles 
SET role = LOWER(role) 
WHERE role != LOWER(role);

UPDATE public.invitations 
SET role_preassigned = LOWER(role_preassigned) 
WHERE role_preassigned != LOWER(role_preassigned);

-- 5. Verify the constraints
SELECT 
    'user_firm_roles' AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.user_firm_roles'::regclass
AND conname = 'user_firm_roles_role_check'

UNION ALL

SELECT 
    'invitations' AS table_name,
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.invitations'::regclass
AND conname = 'invitations_role_check';

-- Success message
SELECT '✅ Role constraints fixed! Lowercase roles (admin_manager, case_manager, associate_lawyer) are now accepted.' AS status;
