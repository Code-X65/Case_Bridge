# H1. SQL Schema & RLS Policies

## 1. Tables

### `firms`
*   **Purpose**: Stores legal firm data. Root of the multi-tenant architecture.
*   **Columns**:
    *   `id` (UUID, PK)
    *   `name` (Text)
    *   `owner_id` (UUID, FK -> auth.users)
    *   `status` (Enum: active, suspended, locked)
    *   `created_at` (Timestamptz)

### `profiles`
*   **Purpose**: Extended user data beyond Supabase Auth.
*   **Columns**:
    *   `id` (UUID, PK, FK -> auth.users)
    *   `email` (Text)
    *   `full_name` (Text)
    *   `firm_id` (UUID, FK -> firms)
    *   `role` (Enum: admin_manager, case_manager, associate_lawyer)
    *   `status` (Enum: active, suspended, locked)
    *   `onboarding_state` (Enum: invited, password_set, active)
    *   `first_login_flag` (Boolean)

### `invitations`
*   **Purpose**: Manages pending invites for non-owner staff.
*   **Columns**:
    *   `id` (UUID, PK)
    *   `firm_id` (UUID, FK -> firms)
    *   `email` (Text)
    *   `role_preassigned` (Enum)
    *   `token` (Text, Unique)
    *   `status` (Enum: pending, accepted, expired)
    *   `expires_at` (Timestamptz)

### `audit_logs`
*   **Purpose**: Immutable log of all critical system actions.
*   **Columns**:
    *   `id` (UUID, PK)
    *   `actor_id` (UUID, FK -> auth.users)
    *   `firm_id` (UUID, FK -> firms)
    *   `action` (Text)
    *   `target_id` (UUID)
    *   `metadata` (JSONB)

### `login_attempts`
*   **Purpose**: Security tracking for brute-force prevention.
*   **Columns**:
    *   `email` (Text, PK)
    *   `attempt_count` (Integer)
    *   `locked_until` (Timestamptz)
    *   `last_attempt_at` (Timestamptz)

---

## 2. Row Level Security (RLS) Policies

### Firm Isolation Strategy
*   **Rule**: `firm_id = auth.uid().firm_id`
*   **Implementation**: A barrier using session variables or a lookup on `user_firm_roles`.

### Policies
1.  **Firms**:
    *   `SELECT`: Users can view their own firm.
    *   `UPDATE`: Only `Admin Manager` can update settings.
2.  **Profiles**:
    *   `SELECT`: Users can view colleagues in the same `firm_id`.
    *   `UPDATE`: Users can update own profile (limited fields). Admins can update status.
3.  **Invitations**:
    *   `ALL`: Only `Admin Manager` of the specific firm can CRUD invitations.
4.  **Audit Logs**:
    *   `SELECT`: Only `Admin Manager` can view logs for their firm.
    *   `INSERT`: System-only (via function/trigger) or authenticated users.

---

## 3. Database Triggers

*   `log_profile_changes`: Automatically inserts into `audit_logs` when a profile role or status changes.
*   `enforce_role_immutable`: Prevents updates to `role` column by non-admins.
