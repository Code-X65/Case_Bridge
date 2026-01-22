-- ============================================================================
-- CASEBRIDGE INTERNAL PLATFORM - INITIAL SETUP
-- ============================================================================
-- This script sets up the CaseBridge firm and creates the system admin account
-- Run this ONCE after running the internal_schema.sql migration
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE THE CASEBRIDGE FIRM
-- ============================================================================
-- This creates the single CaseBridge firm that all internal users belong to

INSERT INTO public.firms (
    id,
    name,
    email,
    phone,
    address,
    created_at,
    updated_at
)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- Fixed UUID for CaseBridge
    'CaseBridge',
    'admin@casebridge.com',
    '+234-800-CASEBRIDGE',
    'Lagos, Nigeria',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Verify firm was created
SELECT 
    id,
    name,
    email,
    created_at
FROM public.firms
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- STEP 2: CREATE SYSTEM ADMIN USER IN SUPABASE AUTH
-- ============================================================================
-- IMPORTANT: You need to do this manually in Supabase Dashboard:
-- 
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter:
--    - Email: admin@casebridge.com (or your preferred admin email)
--    - Password: [Choose a strong password]
--    - Auto Confirm User: YES (check this box)
-- 4. Click "Create User"
-- 5. Copy the User ID that was created
-- 6. Replace <ADMIN_USER_ID> below with the actual User ID
-- 
-- ============================================================================

-- ============================================================================
-- STEP 3: UPDATE ADMIN PROFILE
-- ============================================================================
-- After creating the user in Supabase Dashboard, run this to set up the profile

-- Replace <ADMIN_USER_ID> with the actual User ID from Supabase Dashboard
-- Replace the email with your actual admin email if different

UPDATE public.profiles
SET 
    email = 'admin@casebridge.com',  -- Replace with your admin email
    first_name = 'System',
    last_name = 'Administrator',
    firm_id = '00000000-0000-0000-0000-000000000001',
    internal_role = 'admin_manager',
    status = 'active',
    updated_at = NOW()
WHERE id = '<ADMIN_USER_ID>';  -- Replace with actual User ID

-- If the profile doesn't exist yet (trigger didn't run), insert it:
INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    firm_id,
    internal_role,
    status,
    created_at,
    updated_at
)
VALUES (
    '<ADMIN_USER_ID>',  -- Replace with actual User ID
    'admin@casebridge.com',  -- Replace with your admin email
    'System',
    'Administrator',
    '00000000-0000-0000-0000-000000000001',
    'admin_manager',
    'active',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    firm_id = EXCLUDED.firm_id,
    internal_role = EXCLUDED.internal_role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- ============================================================================
-- STEP 4: VERIFY SETUP
-- ============================================================================
-- Run this to confirm everything is set up correctly

-- Check firm
SELECT 
    'FIRM' as type,
    id,
    name,
    email
FROM public.firms
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

-- Check admin profile
SELECT 
    'ADMIN' as type,
    id,
    first_name || ' ' || last_name as name,
    email
FROM public.profiles
WHERE internal_role = 'admin_manager'
AND firm_id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- You should see 2 rows:
-- 1. FIRM | 00000000-0000-0000-0000-000000000001 | CaseBridge | admin@casebridge.com
-- 2. ADMIN | <your-user-id> | System Administrator | admin@casebridge.com
-- ============================================================================

-- ============================================================================
-- STEP 5: TEST LOGIN
-- ============================================================================
-- After running this script:
-- 1. Go to http://localhost:5173
-- 2. Login with:
--    - Email: admin@casebridge.com (or your admin email)
--    - Password: [The password you set in Supabase Dashboard]
-- 3. You should be redirected to the dashboard
-- 4. You should see all admin menu items (Dashboard, Cases, Team, Settings, Audit Logs)
-- ============================================================================

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. There is only ONE firm: CaseBridge (ID: 00000000-0000-0000-0000-000000000001)
-- 2. There is only ONE admin: The system administrator
-- 3. All other users (Case Managers, Associates) are invited by the admin
-- 4. All invited users will automatically belong to the CaseBridge firm
-- 5. The admin does NOT use the invitation system - created directly via SQL
-- ============================================================================
