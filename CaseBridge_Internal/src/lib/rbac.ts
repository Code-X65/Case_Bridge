/**
 * RBAC Authorization Utilities
 * 
 * Provides client-side permission checking utilities that align with
 * the server-side RBAC implementation. These checks are for UI purposes only;
 * all authorization is enforced server-side via RLS policies.
 */

import { supabase } from './supabase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type InternalRole = 'admin_manager' | 'case_manager' | 'associate_lawyer';

export type Resource =
    | 'matter'
    | 'document'
    | 'note'
    | 'timeline'
    | 'communication'
    | 'evidence'
    | 'filing'
    | 'report'
    | 'case_log'
    | 'client'
    | 'workflow'
    | 'user'
    | 'firm'
    | 'audit_log'
    | 'billing';

export type Action =
    | 'view'
    | 'view_all'
    | 'create'
    | 'edit'
    | 'delete'
    | 'assign'
    | 'reassign'
    | 'archive'
    | 'change_status'
    | 'claim'
    | 'override_lock'
    | 'view_workload'
    | 'view_analytics'
    | 'manage'
    | 'invite'
    | 'suspend';

export interface Permission {
    id: string;
    name: string;
    resource: Resource;
    action: Action;
    description?: string;
}

export interface RolePermission {
    permission_id: string;
    permission_name: string;
    resource: Resource;
    action: Action;
    source_role: InternalRole;
}

// ============================================================================
// ROLE HIERARCHY DEFINITION
// ============================================================================

/**
 * Role hierarchy levels (lower number = higher privilege)
 */
export const ROLE_LEVELS: Record<InternalRole, number> = {
    admin_manager: 1,
    case_manager: 2,
    associate_lawyer: 3,
};

/**
 * Role inheritance map
 */
export const ROLE_INHERITANCE: Record<InternalRole, InternalRole[]> = {
    admin_manager: ['case_manager', 'associate_lawyer'],
    case_manager: ['associate_lawyer'],
    associate_lawyer: [],
};

// ============================================================================
// PERMISSION DEFINITIONS (Client-side mirror of database)
// ============================================================================

/**
 * Base permissions for Associate Lawyer
 * Case Manager automatically inherits ALL of these
 */
export const ASSOCIATE_LAWYER_PERMISSIONS: Array<{ resource: Resource; action: Action }> = [
    { resource: 'matter', action: 'view' },
    { resource: 'matter', action: 'edit' },
    { resource: 'document', action: 'view' },
    { resource: 'document', action: 'create' },
    { resource: 'document', action: 'edit' },
    { resource: 'document', action: 'delete' },
    { resource: 'note', action: 'view' },
    { resource: 'note', action: 'create' },
    { resource: 'note', action: 'edit' },
    { resource: 'timeline', action: 'view' },
    { resource: 'communication', action: 'view' },
    { resource: 'communication', action: 'create' },
    { resource: 'evidence', action: 'view' },
    { resource: 'evidence', action: 'create' },
    { resource: 'filing', action: 'view' },
    { resource: 'filing', action: 'create' },
    { resource: 'report', action: 'create' },
    { resource: 'case_log', action: 'view' },
    { resource: 'client', action: 'view' },
];

/**
 * Additional permissions for Case Manager (beyond Associate Lawyer)
 */
export const CASE_MANAGER_ADDITIONAL_PERMISSIONS: Array<{ resource: Resource; action: Action }> = [
    { resource: 'matter', action: 'view_all' },
    { resource: 'matter', action: 'create' },
    { resource: 'matter', action: 'assign' },
    { resource: 'matter', action: 'reassign' },
    { resource: 'matter', action: 'archive' },
    { resource: 'matter', action: 'change_status' },
    { resource: 'matter', action: 'claim' },
    { resource: 'matter', action: 'override_lock' },
    { resource: 'document', action: 'view_all' },
    { resource: 'report', action: 'view_workload' },
    { resource: 'report', action: 'view_analytics' },
    { resource: 'workflow', action: 'manage' },
];

/**
 * Additional permissions for Admin Manager (beyond Case Manager)
 */
export const ADMIN_MANAGER_ADDITIONAL_PERMISSIONS: Array<{ resource: Resource; action: Action }> = [
    { resource: 'firm', action: 'manage' },
    { resource: 'user', action: 'invite' },
    { resource: 'user', action: 'manage' },
    { resource: 'user', action: 'suspend' },
    { resource: 'audit_log', action: 'view' },
    { resource: 'billing', action: 'manage' },
    { resource: 'report', action: 'view_all' },
    { resource: 'matter', action: 'delete' },
];

// ============================================================================
// PERMISSION CACHE
// ============================================================================

let permissionCache: Map<string, RolePermission[]> = new Map();

/**
 * Clear the permission cache (call when user logs out or role changes)
 */
export function clearPermissionCache(): void {
    permissionCache.clear();
}

// ============================================================================
// CORE PERMISSION FUNCTIONS
// ============================================================================

/**
 * Get all permissions for a role (including inherited)
 * This calls the database function to ensure consistency
 */
export async function getRolePermissions(role: InternalRole): Promise<RolePermission[]> {
    // Check cache first
    const cached = permissionCache.get(role);
    if (cached) {
        return cached;
    }

    try {
        const { data, error } = await supabase.rpc('get_role_permissions', {
            p_role: role,
        });

        if (error) {
            console.error('Error fetching role permissions:', error);
            // Fallback to client-side computation
            return getClientSideRolePermissions(role);
        }

        // Cache the result
        permissionCache.set(role, data || []);
        return data || [];
    } catch (err) {
        console.error('Exception fetching role permissions:', err);
        return getClientSideRolePermissions(role);
    }
}

/**
 * Client-side fallback for computing role permissions
 * Used when database function is unavailable
 */
function getClientSideRolePermissions(role: InternalRole): RolePermission[] {
    const permissions: RolePermission[] = [];

    // Get direct permissions
    let directPerms: Array<{ resource: Resource; action: Action }> = [];

    if (role === 'associate_lawyer') {
        directPerms = ASSOCIATE_LAWYER_PERMISSIONS;
    } else if (role === 'case_manager') {
        directPerms = [
            ...ASSOCIATE_LAWYER_PERMISSIONS,
            ...CASE_MANAGER_ADDITIONAL_PERMISSIONS,
        ];
    } else if (role === 'admin_manager') {
        directPerms = [
            ...ASSOCIATE_LAWYER_PERMISSIONS,
            ...CASE_MANAGER_ADDITIONAL_PERMISSIONS,
            ...ADMIN_MANAGER_ADDITIONAL_PERMISSIONS,
        ];
    }

    // Convert to RolePermission format
    directPerms.forEach((perm, index) => {
        permissions.push({
            permission_id: `client-${role}-${index}`,
            permission_name: `${perm.action}_${perm.resource}`,
            resource: perm.resource,
            action: perm.action,
            source_role: role,
        });
    });

    return permissions;
}

/**
 * Check if a user has a specific permission
 * @param userId - User ID to check
 * @param resource - Resource type
 * @param action - Action type
 * @returns Promise<boolean>
 */
export async function userHasPermission(
    userId: string,
    resource: Resource,
    action: Action
): Promise<boolean> {
    try {
        const { data, error } = await supabase.rpc('user_has_permission', {
            p_user_id: userId,
            p_resource: resource,
            p_action: action,
        });

        if (error) {
            console.error('Error checking user permission:', error);
            return false;
        }

        return data || false;
    } catch (err) {
        console.error('Exception checking user permission:', err);
        return false;
    }
}

/**
 * Check if current user has a specific permission
 * @param resource - Resource type
 * @param action - Action type
 * @returns Promise<boolean>
 */
export async function hasPermission(resource: Resource, action: Action): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    return userHasPermission(user.id, resource, action);
}

/**
 * Check if a role has a specific permission (client-side check)
 * Useful for UI rendering decisions before async calls
 */
export function roleHasPermission(
    role: InternalRole,
    resource: Resource,
    action: Action
): boolean {
    const permissions = getClientSideRolePermissions(role);
    return permissions.some(p => p.resource === resource && p.action === action);
}

/**
 * Check if a role inherits from another role
 */
export function roleInheritsFrom(role: InternalRole, targetRole: InternalRole): boolean {
    if (role === targetRole) return true;

    const inherits = ROLE_INHERITANCE[role] || [];
    return inherits.includes(targetRole);
}

/**
 * Check if a role has higher or equal privilege than another
 */
export function roleHasEqualOrHigherPrivilege(role: InternalRole, targetRole: InternalRole): boolean {
    return ROLE_LEVELS[role] <= ROLE_LEVELS[targetRole];
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user can view a matter
 * @param userRole - User's role
 * @param matterId - Matter ID
 * @param isAssigned - Whether user is assigned to the matter
 * @param isInUserFirm - Whether matter belongs to user's firm
 */
export function canViewMatter(
    userRole: InternalRole,
    isAssigned: boolean,
    isInUserFirm: boolean
): boolean {
    // Case Manager and Admin Manager can view all firm matters
    if (roleHasPermission(userRole, 'matter', 'view_all') && isInUserFirm) {
        return true;
    }

    // Associate Lawyer can view assigned matters
    if (roleHasPermission(userRole, 'matter', 'view') && isAssigned) {
        return true;
    }

    return false;
}

/**
 * Check if user can edit a matter
 */
export function canEditMatter(
    userRole: InternalRole,
    isAssigned: boolean,
    isInUserFirm: boolean
): boolean {
    // Case Manager can edit all firm matters
    if (roleHasPermission(userRole, 'matter', 'view_all') &&
        roleHasPermission(userRole, 'matter', 'edit') &&
        isInUserFirm) {
        return true;
    }

    // Associate Lawyer can edit assigned matters
    if (roleHasPermission(userRole, 'matter', 'edit') && isAssigned) {
        return true;
    }

    return false;
}

/**
 * Check if user can assign matters
 */
export function canAssignMatters(userRole: InternalRole): boolean {
    return roleHasPermission(userRole, 'matter', 'assign');
}

/**
 * Check if user can manage team
 */
export function canManageTeam(userRole: InternalRole): boolean {
    return roleHasPermission(userRole, 'user', 'manage');
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(userRole: InternalRole): boolean {
    return roleHasPermission(userRole, 'audit_log', 'view');
}

/**
 * Check if user can access admin features
 */
export function isAdmin(userRole: InternalRole): boolean {
    return userRole === 'admin_manager';
}

/**
 * Check if user can access case manager features
 */
export function isCaseManagerOrHigher(userRole: InternalRole): boolean {
    return roleHasEqualOrHigherPrivilege(userRole, 'case_manager');
}

// ============================================================================
// REACT HOOKS (Optional - for React components)
// ============================================================================

/**
 * Hook to check if current user has a permission
 * Usage: const canEdit = usePermission('matter', 'edit');
 */
export function usePermission(resource: Resource, action: Action): boolean {
    const [hasPermissionState, setHasPermission] = React.useState(false);

    React.useEffect(() => {
        hasPermission(resource, action).then(setHasPermission);
    }, [resource, action]);

    return hasPermissionState;
}

/**
 * Hook to get current user's role
 */
export function useUserRole(): InternalRole | null {
    const [role, setRole] = React.useState<InternalRole | null>(null);

    React.useEffect(() => {
        const fetchRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('internal_role')
                .eq('id', user.id)
                .single();

            if (profile?.internal_role) {
                setRole(profile.internal_role as InternalRole);
            }
        };

        fetchRole();
    }, []);

    return role;
}

// Note: Import React if you want to use the hooks
// import React from 'react';
