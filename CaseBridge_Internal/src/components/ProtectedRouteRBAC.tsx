/**
 * Enhanced Protected Route with RBAC Support
 * 
 * This component enforces role-based access control at the route level.
 * It supports both role-based and permission-based access control.
 */

import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    type InternalRole,
    type Resource,
    type Action,
    roleHasPermission,
    roleInheritsFrom,
    clearPermissionCache
} from '@/lib/rbac';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
    children: ReactNode;

    // Role-based access (legacy support)
    requiredRole?: InternalRole | InternalRole[];

    // Permission-based access (new RBAC system)
    requiredPermission?: {
        resource: Resource;
        action: Action;
    };

    // Allow multiple permissions (user needs at least one)
    requiredAnyPermission?: Array<{
        resource: Resource;
        action: Action;
    }>;

    // Require all permissions
    requiredAllPermissions?: Array<{
        resource: Resource;
        action: Action;
    }>;
}

export default function ProtectedRoute({
    children,
    requiredRole,
    requiredPermission,
    requiredAnyPermission,
    requiredAllPermissions
}: ProtectedRouteProps) {
    const { data: session, isLoading: sessionLoading } = useQuery({
        queryKey: ['session'],
        queryFn: async () => {
            const { data: { session } } = await supabase.auth.getSession();
            return session;
        },
    });

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['profile', session?.user?.id],
        queryFn: async () => {
            if (!session?.user?.id) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('id, firm_id, internal_role, status, first_name, last_name, email')
                .eq('id', session.user.id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!session?.user?.id,
    });

    // Clear permission cache when user changes
    React.useEffect(() => {
        if (!session?.user?.id) {
            clearPermissionCache();
        }
    }, [session?.user?.id]);

    if (sessionLoading || profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-600 font-medium">Authenticating...</p>
                </div>
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    if (!profile) {
        return <Navigate to="/login" replace />;
    }

    // Check if user is internal user
    if (!profile.internal_role) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                    <h2 className="text-xl font-black text-slate-900 mb-2">Access Denied</h2>
                    <p className="text-sm text-slate-600">This portal is for internal users only.</p>
                </div>
            </div>
        );
    }

    // Check if user is active
    if (profile.status !== 'active') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                    <h2 className="text-xl font-black text-slate-900 mb-2">Account {profile.status}</h2>
                    <p className="text-sm text-slate-600">
                        Your account has been {profile.status}. Please contact your administrator.
                    </p>
                </div>
            </div>
        );
    }

    const userRole = profile.internal_role as InternalRole;

    // ============================================================================
    // ROLE-BASED ACCESS CONTROL (Legacy Support)
    // ============================================================================
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        // Check if user's role matches or inherits from required roles
        const hasRequiredRole = roles.some(role => {
            // Exact match
            if (userRole === role) return true;

            // Check inheritance (e.g., case_manager inherits from associate_lawyer)
            return roleInheritsFrom(userRole, role);
        });

        if (!hasRequiredRole) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                        <h2 className="text-xl font-black text-slate-900 mb-2">Insufficient Permissions</h2>
                        <p className="text-sm text-slate-600">
                            You don't have permission to access this page.
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Required role: {roles.join(' or ')}
                        </p>
                        <p className="text-xs text-slate-500">
                            Your role: {userRole}
                        </p>
                    </div>
                </div>
            );
        }
    }

    // ============================================================================
    // PERMISSION-BASED ACCESS CONTROL (New RBAC System)
    // ============================================================================

    // Check single required permission
    if (requiredPermission) {
        const hasPermission = roleHasPermission(
            userRole,
            requiredPermission.resource,
            requiredPermission.action
        );

        if (!hasPermission) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                        <h2 className="text-xl font-black text-slate-900 mb-2">Insufficient Permissions</h2>
                        <p className="text-sm text-slate-600">
                            You don't have permission to access this page.
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Required permission: {requiredPermission.action} on {requiredPermission.resource}
                        </p>
                    </div>
                </div>
            );
        }
    }

    // Check if user has at least one of the required permissions
    if (requiredAnyPermission && requiredAnyPermission.length > 0) {
        const hasAnyPermission = requiredAnyPermission.some(perm =>
            roleHasPermission(userRole, perm.resource, perm.action)
        );

        if (!hasAnyPermission) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                        <h2 className="text-xl font-black text-slate-900 mb-2">Insufficient Permissions</h2>
                        <p className="text-sm text-slate-600">
                            You don't have permission to access this page.
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            You need at least one of the following permissions:
                        </p>
                        <ul className="text-xs text-slate-500 mt-1">
                            {requiredAnyPermission.map((perm, idx) => (
                                <li key={idx}>{perm.action} on {perm.resource}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }
    }

    // Check if user has all required permissions
    if (requiredAllPermissions && requiredAllPermissions.length > 0) {
        const missingPermissions = requiredAllPermissions.filter(perm =>
            !roleHasPermission(userRole, perm.resource, perm.action)
        );

        if (missingPermissions.length > 0) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50">
                    <div className="max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
                        <h2 className="text-xl font-black text-slate-900 mb-2">Insufficient Permissions</h2>
                        <p className="text-sm text-slate-600">
                            You don't have all required permissions to access this page.
                        </p>
                        <p className="text-xs text-slate-500 mt-2">
                            Missing permissions:
                        </p>
                        <ul className="text-xs text-slate-500 mt-1">
                            {missingPermissions.map((perm, idx) => (
                                <li key={idx}>{perm.action} on {perm.resource}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            );
        }
    }

    return <>{children}</>;
}

// Note: Import React for useEffect
import React from 'react';
