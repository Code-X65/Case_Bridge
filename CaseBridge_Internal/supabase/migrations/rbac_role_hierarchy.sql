-- ============================================================================
-- ROLE-BASED ACCESS CONTROL (RBAC) WITH HIERARCHICAL INHERITANCE
-- ============================================================================
-- This migration implements a hierarchical RBAC system where:
-- - Case Manager inherits ALL permissions from Associate Lawyer
-- - Admin Manager inherits ALL permissions from Case Manager (and transitively from Associate Lawyer)
-- - Future permissions added to lower roles automatically propagate upward
-- ============================================================================

-- ============================================================================
-- 1. ROLE HIERARCHY TABLE
-- ============================================================================
-- Defines the role inheritance structure

CREATE TABLE IF NOT EXISTS public.role_hierarchy (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL UNIQUE CHECK (role IN ('admin_manager', 'case_manager', 'associate_lawyer')),
    inherits_from TEXT[] DEFAULT '{}',
    level INTEGER NOT NULL UNIQUE, -- Lower number = higher privilege
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the role hierarchy
INSERT INTO public.role_hierarchy (role, inherits_from, level, description) VALUES
    ('admin_manager', ARRAY['case_manager', 'associate_lawyer'], 1, 'Full administrative access with all case manager and associate lawyer permissions'),
    ('case_manager', ARRAY['associate_lawyer'], 2, 'Case management with all associate lawyer permissions plus assignment and workflow control'),
    ('associate_lawyer', ARRAY[]::TEXT[], 3, 'Base case handling permissions')
ON CONFLICT (role) DO UPDATE SET
    inherits_from = EXCLUDED.inherits_from,
    level = EXCLUDED.level,
    description = EXCLUDED.description,
    updated_at = NOW();

-- ============================================================================
-- 2. PERMISSIONS TABLE
-- ============================================================================
-- Defines granular permissions that can be assigned to roles

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    resource TEXT NOT NULL, -- e.g., 'matter', 'document', 'client', 'report'
    action TEXT NOT NULL, -- e.g., 'view', 'create', 'edit', 'delete', 'assign', 'archive'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource, action)
);

-- ============================================================================
-- 3. ROLE PERMISSIONS MAPPING TABLE
-- ============================================================================
-- Maps permissions to roles (only direct assignments, inheritance is computed)

CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('admin_manager', 'case_manager', 'associate_lawyer')),
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, permission_id)
);

-- ============================================================================
-- 4. SEED BASE PERMISSIONS FOR ASSOCIATE LAWYER
-- ============================================================================
-- These are the foundational permissions that Case Manager will inherit

-- Matter/Case Permissions
INSERT INTO public.permissions (name, resource, action, description) VALUES
    ('view_assigned_matters', 'matter', 'view', 'View matters assigned to the user'),
    ('edit_assigned_matters', 'matter', 'edit', 'Edit matters assigned to the user'),
    ('view_matter_documents', 'document', 'view', 'View documents attached to assigned matters'),
    ('upload_matter_documents', 'document', 'create', 'Upload documents to assigned matters'),
    ('edit_matter_documents', 'document', 'edit', 'Edit/update documents in assigned matters'),
    ('delete_matter_documents', 'document', 'delete', 'Delete documents from assigned matters'),
    ('view_matter_notes', 'note', 'view', 'View case notes for assigned matters'),
    ('create_matter_notes', 'note', 'create', 'Create case notes for assigned matters'),
    ('edit_matter_notes', 'note', 'edit', 'Edit case notes for assigned matters'),
    ('view_matter_timeline', 'timeline', 'view', 'View case timeline/activity for assigned matters'),
    ('view_matter_communications', 'communication', 'view', 'View communications related to assigned matters'),
    ('create_matter_communications', 'communication', 'create', 'Create communications for assigned matters'),
    ('view_matter_evidence', 'evidence', 'view', 'View evidence for assigned matters'),
    ('upload_matter_evidence', 'evidence', 'create', 'Upload evidence for assigned matters'),
    ('view_court_filings', 'filing', 'view', 'View court filings for assigned matters'),
    ('create_court_filings', 'filing', 'create', 'Create court filings for assigned matters'),
    ('submit_court_reports', 'report', 'create', 'Submit court reports for assigned matters'),
    ('view_case_logs', 'case_log', 'view', 'View activity logs for assigned matters'),
    ('view_client_info', 'client', 'view', 'View client information for assigned matters')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign all Associate Lawyer permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'associate_lawyer', id FROM public.permissions
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================================
-- 5. SEED ADDITIONAL PERMISSIONS FOR CASE MANAGER
-- ============================================================================
-- These are ADDITIONAL permissions beyond what Associate Lawyer has

INSERT INTO public.permissions (name, resource, action, description) VALUES
    ('view_all_firm_matters', 'matter', 'view_all', 'View all matters in the firm, not just assigned ones'),
    ('create_matters', 'matter', 'create', 'Create new matters/cases'),
    ('assign_matters', 'matter', 'assign', 'Assign matters to associate lawyers'),
    ('reassign_matters', 'matter', 'reassign', 'Reassign matters between associates'),
    ('archive_matters', 'matter', 'archive', 'Archive completed matters'),
    ('change_matter_status', 'matter', 'change_status', 'Change matter status through workflow'),
    ('claim_unassigned_matters', 'matter', 'claim', 'Claim matters from unassigned pool'),
    ('view_all_documents', 'document', 'view_all', 'View all documents across all firm matters'),
    ('override_case_locks', 'matter', 'override_lock', 'Override case locks or restrictions'),
    ('view_team_workload', 'report', 'view_workload', 'View team workload and assignment reports'),
    ('view_case_analytics', 'report', 'view_analytics', 'View case analytics and dashboards'),
    ('manage_case_workflows', 'workflow', 'manage', 'Manage case workflow configurations')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign Case Manager specific permissions (inheritance will add Associate Lawyer permissions)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'case_manager', id FROM public.permissions
WHERE name IN (
    'view_all_firm_matters',
    'create_matters',
    'assign_matters',
    'reassign_matters',
    'archive_matters',
    'change_matter_status',
    'claim_unassigned_matters',
    'view_all_documents',
    'override_case_locks',
    'view_team_workload',
    'view_case_analytics',
    'manage_case_workflows'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================================
-- 6. SEED ADMIN MANAGER PERMISSIONS
-- ============================================================================
-- Admin-specific permissions (inherits all Case Manager + Associate Lawyer permissions)

INSERT INTO public.permissions (name, resource, action, description) VALUES
    ('manage_firm_settings', 'firm', 'manage', 'Manage firm settings and configuration'),
    ('invite_team_members', 'user', 'invite', 'Invite new team members'),
    ('manage_team_members', 'user', 'manage', 'Manage team member accounts and roles'),
    ('suspend_users', 'user', 'suspend', 'Suspend user accounts'),
    ('view_audit_logs', 'audit_log', 'view', 'View system audit logs'),
    ('manage_billing', 'billing', 'manage', 'Manage firm billing and subscriptions'),
    ('view_all_reports', 'report', 'view_all', 'Access all system reports and analytics'),
    ('delete_matters', 'matter', 'delete', 'Permanently delete matters (with restrictions)')
ON CONFLICT (resource, action) DO NOTHING;

-- Assign Admin Manager specific permissions
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin_manager', id FROM public.permissions
WHERE name IN (
    'manage_firm_settings',
    'invite_team_members',
    'manage_team_members',
    'suspend_users',
    'view_audit_logs',
    'manage_billing',
    'view_all_reports',
    'delete_matters'
)
ON CONFLICT (role, permission_id) DO NOTHING;

-- ============================================================================
-- 7. HELPER FUNCTIONS FOR PERMISSION CHECKING
-- ============================================================================

-- Function to get all permissions for a role (including inherited)
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role TEXT)
RETURNS TABLE (
    permission_id UUID,
    permission_name TEXT,
    resource TEXT,
    action TEXT,
    source_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE role_chain AS (
        -- Start with the given role
        SELECT 
            rh.role,
            rh.inherits_from,
            rh.role as source_role,
            0 as depth
        FROM public.role_hierarchy rh
        WHERE rh.role = p_role
        
        UNION ALL
        
        -- Recursively get inherited roles
        SELECT 
            rh.role,
            rh.inherits_from,
            rc.source_role,
            rc.depth + 1
        FROM public.role_hierarchy rh
        INNER JOIN role_chain rc ON rh.role = ANY(rc.inherits_from)
    )
    SELECT DISTINCT
        p.id as permission_id,
        p.name as permission_name,
        p.resource,
        p.action,
        rc.role as source_role
    FROM role_chain rc
    INNER JOIN public.role_permissions rp ON rp.role = rc.role
    INNER JOIN public.permissions p ON p.id = rp.permission_id
    ORDER BY p.resource, p.action;
END;
$$;

-- Function to check if a user has a specific permission
CREATE OR REPLACE FUNCTION public.user_has_permission(
    p_user_id UUID,
    p_resource TEXT,
    p_action TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
    v_has_permission BOOLEAN;
BEGIN
    -- Get user's role
    SELECT internal_role INTO v_user_role
    FROM public.profiles
    WHERE id = p_user_id AND status = 'active';
    
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user has permission (including inherited)
    SELECT EXISTS(
        SELECT 1 FROM public.get_role_permissions(v_user_role)
        WHERE resource = p_resource AND action = p_action
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$;

-- Function to check if a user has any of multiple permissions
CREATE OR REPLACE FUNCTION public.user_has_any_permission(
    p_user_id UUID,
    p_permissions JSONB -- Array of {resource, action} objects
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
    v_permission JSONB;
BEGIN
    -- Get user's role
    SELECT internal_role INTO v_user_role
    FROM public.profiles
    WHERE id = p_user_id AND status = 'active';
    
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check each permission
    FOR v_permission IN SELECT * FROM jsonb_array_elements(p_permissions)
    LOOP
        IF EXISTS(
            SELECT 1 FROM public.get_role_permissions(v_user_role)
            WHERE resource = v_permission->>'resource' 
            AND action = v_permission->>'action'
        ) THEN
            RETURN TRUE;
        END IF;
    END LOOP;
    
    RETURN FALSE;
END;
$$;

-- ============================================================================
-- 8. ENHANCED RLS POLICIES USING PERMISSION SYSTEM
-- ============================================================================
-- NOTE: These policies are examples. Only apply them if the tables exist.
-- If a table doesn't exist, the policy creation will be skipped.

-- Update matters view policy to use permission system
DROP POLICY IF EXISTS "Permission-based matter view" ON public.matters;
CREATE POLICY "Permission-based matter view"
ON public.matters FOR SELECT
USING (
    -- Case Managers and Admin Managers can view all firm matters
    (
        public.user_has_permission(auth.uid(), 'matter', 'view_all')
        AND firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    -- Associate Lawyers can view assigned matters
    (
        public.user_has_permission(auth.uid(), 'matter', 'view')
        AND EXISTS (
            SELECT 1 FROM public.case_assignments
            WHERE matter_id = public.matters.id
            AND associate_id = auth.uid()
        )
    )
    OR
    -- Unassigned pool visible to those who can claim
    (
        firm_id IS NULL 
        AND public.user_has_permission(auth.uid(), 'matter', 'claim')
    )
);

-- Update matters edit policy
DROP POLICY IF EXISTS "Permission-based matter edit" ON public.matters;
CREATE POLICY "Permission-based matter edit"
ON public.matters FOR UPDATE
USING (
    -- Can edit if has view_all permission and matter is in their firm
    (
        public.user_has_permission(auth.uid(), 'matter', 'view_all')
        AND public.user_has_permission(auth.uid(), 'matter', 'edit')
        AND firm_id IN (SELECT firm_id FROM public.profiles WHERE id = auth.uid())
    )
    OR
    -- Associate lawyers can edit their assigned matters
    (
        public.user_has_permission(auth.uid(), 'matter', 'edit')
        AND EXISTS (
            SELECT 1 FROM public.case_assignments
            WHERE matter_id = public.matters.id
            AND associate_id = auth.uid()
        )
    )
);

-- Documents view policy (only if documents table exists)
-- Uncomment the following if you have a documents table:
/*
DROP POLICY IF EXISTS "Permission-based document view" ON public.documents;
CREATE POLICY "Permission-based document view"
ON public.documents FOR SELECT
USING (
    -- Can view all documents if has permission
    public.user_has_permission(auth.uid(), 'document', 'view_all')
    OR
    -- Can view documents for assigned matters
    (
        public.user_has_permission(auth.uid(), 'document', 'view')
        AND matter_id IN (
            SELECT matter_id FROM public.case_assignments
            WHERE associate_id = auth.uid()
        )
    )
);
*/

-- ============================================================================
-- 9. AUDIT LOGGING FOR ROLE ACTIONS
-- ============================================================================

-- Enhanced audit log to track role-based actions
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS actor_role TEXT,
ADD COLUMN IF NOT EXISTS permission_used TEXT;

-- Function to log permission-based actions
CREATE OR REPLACE FUNCTION public.log_permission_action(
    p_action TEXT,
    p_resource TEXT,
    p_resource_id UUID,
    p_details JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_role TEXT;
    v_firm_id UUID;
BEGIN
    SELECT internal_role, firm_id INTO v_user_role, v_firm_id
    FROM public.profiles
    WHERE id = auth.uid();
    
    INSERT INTO public.audit_logs (
        firm_id,
        actor_id,
        actor_role,
        action,
        permission_used,
        details,
        created_at
    ) VALUES (
        v_firm_id,
        auth.uid(),
        v_user_role,
        p_action,
        p_resource || ':' || p_action,
        jsonb_build_object(
            'resource', p_resource,
            'resource_id', p_resource_id,
            'additional_details', p_details
        ),
        NOW()
    );
END;
$$;

-- ============================================================================
-- 10. VIEWS FOR EASY PERMISSION QUERYING
-- ============================================================================

-- View to see all effective permissions per role
CREATE OR REPLACE VIEW public.role_permissions_effective AS
SELECT 
    rh.role,
    rh.level as role_level,
    p.id as permission_id,
    p.name as permission_name,
    p.resource,
    p.action,
    p.description,
    CASE 
        WHEN rp.role = rh.role THEN 'direct'
        ELSE 'inherited'
    END as assignment_type,
    rp.role as source_role
FROM public.role_hierarchy rh
CROSS JOIN LATERAL (
    SELECT * FROM public.get_role_permissions(rh.role)
) AS perms(permission_id, permission_name, resource, action, source_role)
INNER JOIN public.permissions p ON p.id = perms.permission_id
LEFT JOIN public.role_permissions rp ON rp.permission_id = p.id AND rp.role = perms.source_role;

-- View to see user permissions
CREATE OR REPLACE VIEW public.user_permissions AS
SELECT 
    prof.id as user_id,
    prof.email,
    prof.first_name,
    prof.last_name,
    prof.internal_role,
    rpe.permission_id,
    rpe.permission_name,
    rpe.resource,
    rpe.action,
    rpe.assignment_type,
    rpe.source_role
FROM public.profiles prof
INNER JOIN public.role_permissions_effective rpe ON rpe.role = prof.internal_role
WHERE prof.internal_role IS NOT NULL
  AND prof.status = 'active';

-- ============================================================================
-- 11. VALIDATION FUNCTION
-- ============================================================================

-- Function to validate that Case Manager has all Associate Lawyer permissions
CREATE OR REPLACE FUNCTION public.validate_role_inheritance()
RETURNS TABLE (
    validation_status TEXT,
    missing_permissions TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_missing_perms TEXT[];
BEGIN
    -- Check if Case Manager has all Associate Lawyer permissions
    SELECT ARRAY_AGG(p.name)
    INTO v_missing_perms
    FROM public.permissions p
    INNER JOIN public.role_permissions rp_al ON rp_al.permission_id = p.id AND rp_al.role = 'associate_lawyer'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.get_role_permissions('case_manager') grp
        WHERE grp.permission_id = p.id
    );
    
    IF v_missing_perms IS NULL OR array_length(v_missing_perms, 1) = 0 THEN
        RETURN QUERY SELECT 'PASS'::TEXT, '{}'::TEXT[];
    ELSE
        RETURN QUERY SELECT 'FAIL'::TEXT, v_missing_perms;
    END IF;
END;
$$;

-- ============================================================================
-- SCHEMA REFRESH
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify the setup)
-- ============================================================================

-- 1. View all permissions for each role
-- SELECT * FROM public.role_permissions_effective ORDER BY role_level, resource, action;

-- 2. Verify Case Manager inherits all Associate Lawyer permissions
-- SELECT * FROM public.validate_role_inheritance();

-- 3. Check specific user permissions
-- SELECT * FROM public.user_permissions WHERE email = 'user@example.com';

-- 4. Test permission check
-- SELECT public.user_has_permission(auth.uid(), 'matter', 'view');
