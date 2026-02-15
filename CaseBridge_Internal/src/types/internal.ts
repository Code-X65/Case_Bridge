export interface UserRole {
    id: string;
    role: string;
    profiles: {
        full_name: string | null;
        email: string | null;
        onboarding_state: string;
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
