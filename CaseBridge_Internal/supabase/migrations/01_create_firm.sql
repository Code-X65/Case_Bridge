-- ============================================================================
-- CASEBRIDGE SETUP - COMPLETE IN ONE STEP
-- ============================================================================
-- This script creates the CaseBridge firm with a fixed ID
-- After running this, you only need to:
-- 1. Create admin user in Supabase Dashboard
-- 2. Update the profile with the user ID
-- ============================================================================

-- Create CaseBridge Firm
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
    '00000000-0000-0000-0000-000000000001',
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
    'Firm created successfully!' as status
FROM public.firms
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ============================================================================
-- NEXT STEPS:
-- ============================================================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → "Create new user"
-- 3. Enter:
--    - Email: admin@casebridge.com
--    - Password: [Your secure password]
--    - Auto Confirm User: YES
-- 4. Copy the User ID
-- 5. Run the command below, replacing <USER_ID>:
--
-- INSERT INTO public.profiles (id, email, first_name, last_name, firm_id, internal_role, status)
-- VALUES ('<USER_ID>', 'admin@casebridge.com', 'System', 'Administrator', '00000000-0000-0000-0000-000000000001', 'admin_manager', 'active')
-- ON CONFLICT (id) DO UPDATE SET firm_id = EXCLUDED.firm_id, internal_role = EXCLUDED.internal_role, status = EXCLUDED.status;
--
-- 6. Login at http://localhost:5173
-- ============================================================================
