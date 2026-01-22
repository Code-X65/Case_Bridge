-- ============================================================================
-- VERIFY ADMIN SETUP
-- ============================================================================
-- Run this to check if your admin account is set up correctly
-- ============================================================================

-- Check if CaseBridge firm exists
SELECT 
    '✅ FIRM CHECK' as check_type,
    id,
    name,
    email,
    CASE 
        WHEN id = '00000000-0000-0000-0000-000000000001' THEN '✅ Correct ID'
        ELSE '❌ Wrong ID'
    END as status
FROM public.firms
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Check if admin profile exists and is configured correctly
SELECT 
    '✅ ADMIN CHECK' as check_type,
    id,
    email,
    first_name || ' ' || last_name as full_name,
    internal_role,
    firm_id,
    status,
    CASE 
        WHEN internal_role = 'admin_manager' THEN '✅ Correct Role'
        WHEN internal_role IS NULL THEN '❌ No Role Set'
        ELSE '❌ Wrong Role: ' || internal_role
    END as role_check,
    CASE 
        WHEN firm_id = '00000000-0000-0000-0000-000000000001' THEN '✅ Correct Firm'
        WHEN firm_id IS NULL THEN '❌ No Firm Set'
        ELSE '❌ Wrong Firm'
    END as firm_check,
    CASE 
        WHEN status = 'active' THEN '✅ Active'
        WHEN status IS NULL THEN '❌ No Status'
        ELSE '❌ Status: ' || status
    END as status_check
FROM public.profiles
WHERE id = '6f9e0a6e-8d74-4ddc-aa0f-3a30a6c124fa';

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Row 1 (FIRM CHECK):
--   - id: 00000000-0000-0000-0000-000000000001
--   - name: CaseBridge
--   - status: ✅ Correct ID
--
-- Row 2 (ADMIN CHECK):
--   - id: 6f9e0a6e-8d74-4ddc-aa0f-3a30a6c124fa
--   - email: admin@casebridge.com
--   - full_name: System Administrator
--   - internal_role: admin_manager
--   - firm_id: 00000000-0000-0000-0000-000000000001
--   - status: active
--   - role_check: ✅ Correct Role
--   - firm_check: ✅ Correct Firm
--   - status_check: ✅ Active
-- ============================================================================

-- If any checks show ❌, run the fix below:

-- FIX: Update admin profile
UPDATE public.profiles
SET 
    email = 'admin@casebridge.com',
    first_name = 'System',
    last_name = 'Administrator',
    firm_id = '00000000-0000-0000-0000-000000000001',
    internal_role = 'admin_manager',
    status = 'active',
    updated_at = NOW()
WHERE id = '6f9e0a6e-8d74-4ddc-aa0f-3a30a6c124fa';

-- Verify the fix worked
SELECT 
    id,
    email,
    first_name || ' ' || last_name as full_name,
    internal_role,
    firm_id,
    status
FROM public.profiles
WHERE id = '6f9e0a6e-8d74-4ddc-aa0f-3a30a6c124fa';
