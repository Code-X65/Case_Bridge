


/**
 * Resolves the home route for a user based on their profile and role.
 * This is the single source of truth for identity-state navigation.
 */
export function resolveUserHome(profile: { role: string; status: string } | null | undefined): string {
    if (!profile) return '/internal/login';

    // Status Guard
    if (profile.status !== 'active') return '/auth/locked'; // Assuming locked route

    // Role Routing
    switch (profile.role) {
        case 'admin_manager': // Mapping 'admin' to internal role name if distinct
        case 'admin':
            return '/internal/dashboard';
        case 'case_manager':
            return '/internal/case-manager/dashboard';
        case 'associate_lawyer':
        case 'associate':
            return '/internal/associate/dashboard';
        default:
            return '/auth/unauthorized';
    }
}
