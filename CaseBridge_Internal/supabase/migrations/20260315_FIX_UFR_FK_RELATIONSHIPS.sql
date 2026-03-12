-- ==========================================
-- FIX: User Firm Roles Foreign Key Relationships
-- ==========================================
-- This migration ensures proper foreign key relationships 
-- for PostgREST to resolve nested queries

-- 1. Ensure user_firm_roles has proper foreign key to firms
-- Drop existing FK if exists
ALTER TABLE public.user_firm_roles 
DROP CONSTRAINT IF EXISTS user_firm_roles_firm_id_fkey;

-- Add proper foreign key to firms
ALTER TABLE public.user_firm_roles 
ADD CONSTRAINT user_firm_roles_firm_id_fkey 
FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

-- 2. Add comment to help PostgREST detect the relationship
COMMENT ON CONSTRAINT user_firm_roles_firm_id_fkey ON public.user_firm_roles 
IS 'foreign key for firms relation';

-- 3. Ensure user_firm_roles has proper foreign key to profiles
ALTER TABLE public.user_firm_roles 
DROP CONSTRAINT IF EXISTS user_firm_roles_user_id_fkey;

ALTER TABLE public.user_firm_roles 
ADD CONSTRAINT user_firm_roles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT user_firm_roles_user_id_fkey ON public.user_firm_roles 
IS 'foreign key for profiles relation';

-- 4. Verify the relationships are set up correctly
-- Run this to check:
-- SELECT
--     tc.constraint_name, 
--     tc.table_name, 
--     kcu.column_name, 
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--     ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--     ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
-- AND tc.table_name = 'user_firm_roles';
