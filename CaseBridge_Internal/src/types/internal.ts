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

export interface Task {
    id: string;
    firm_id: string;
    matter_id: string | null;
    assigned_to: string;
    created_by: string;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    due_date: string | null;
    depends_on_id: string | null;
    recurrence_rule: string | null;
    is_template: boolean;
    parent_task_id: string | null;
    created_at: string;
    updated_at: string;
    assignee?: {
        full_name: string;
        email: string;
    };
    matter?: {
        title: string;
    };
}
