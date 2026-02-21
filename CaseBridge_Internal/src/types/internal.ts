export interface UserRole {
    id: string; // This is the UUID of the role record
    user_id: string; // The auth.users UUID
    firm_id: string;
    role: string;
    status: 'active' | 'suspended' | 'locked' | 'deleted';
    profiles: {
        id: string;
        full_name: string | null;
        email: string | null;
        onboarding_state: string;
        status: string;
    } | null;
}

export interface Invitation {
    id: string;
    email: string;
    role_preassigned: string;
    token: string;
    first_name: string | null;
    last_name: string | null;
}
