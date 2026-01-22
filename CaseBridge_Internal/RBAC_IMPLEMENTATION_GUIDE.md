# Role-Based Access Control (RBAC) Implementation Guide

## Overview

This document describes the comprehensive RBAC system implemented for the CaseBridge legal case management platform. The system ensures that **Case Managers automatically inherit 100% of Associate Lawyer permissions** through a hierarchical role inheritance model.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Role Hierarchy](#role-hierarchy)
3. [Permission System](#permission-system)
4. [Database Schema](#database-schema)
5. [Backend Enforcement](#backend-enforcement)
6. [Frontend Integration](#frontend-integration)
7. [Permission Inheritance Mechanism](#permission-inheritance-mechanism)
8. [Usage Examples](#usage-examples)
9. [Testing & Validation](#testing--validation)
10. [Future-Proofing](#future-proofing)

---

## Architecture Overview

The RBAC system is built on three core principles:

1. **Hierarchical Role Inheritance**: Higher-level roles automatically inherit all permissions from lower-level roles
2. **Server-Side Enforcement**: All authorization is enforced via PostgreSQL Row Level Security (RLS) policies
3. **Permission Composition**: Permissions are granular and composable, allowing flexible access control

### Key Components

```
┌─────────────────────────────────────────────────────────────┐
│                     RBAC Architecture                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐     ┌────────────┐ │
│  │   Database   │◄─────┤   Backend    │◄────┤  Frontend  │ │
│  │   (Source    │      │  (RLS        │     │  (UI       │ │
│  │   of Truth)  │      │   Policies)  │     │   Hints)   │ │
│  └──────────────┘      └──────────────┘     └────────────┘ │
│         │                      │                    │        │
│         │                      │                    │        │
│    ┌────▼──────────────────────▼────────────────────▼────┐  │
│    │         Permission Inheritance Engine               │  │
│    │  (Automatically propagates permissions upward)      │  │
│    └─────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Role Hierarchy

### Hierarchy Structure

```
┌─────────────────────────────────────────────────────────┐
│                    Admin Manager                        │
│                    (Level 1)                            │
│  ┌──────────────────────────────────────────────────┐  │
│  │  • Full administrative access                    │  │
│  │  • Inherits from: Case Manager, Associate Lawyer │  │
│  │  • Additional: Team management, audit logs       │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ Inherits ALL permissions
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Case Manager                          │
│                   (Level 2)                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  • Case assignment & workflow control            │  │
│  │  • Inherits from: Associate Lawyer               │  │
│  │  • Additional: Assign cases, view all matters    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ Inherits ALL permissions
                     ▼
┌─────────────────────────────────────────────────────────┐
│                 Associate Lawyer                        │
│                 (Level 3)                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │  • Base case handling permissions                │  │
│  │  • View/edit assigned matters                    │  │
│  │  • Manage documents, notes, communications       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Role Levels

| Role              | Level | Inherits From                      |
|-------------------|-------|------------------------------------|
| Admin Manager     | 1     | Case Manager, Associate Lawyer     |
| Case Manager      | 2     | Associate Lawyer                   |
| Associate Lawyer  | 3     | None (base role)                   |

**Lower level number = Higher privilege**

---

## Permission System

### Permission Structure

Each permission consists of:
- **Resource**: The entity being accessed (e.g., `matter`, `document`, `client`)
- **Action**: The operation being performed (e.g., `view`, `edit`, `create`, `delete`)
- **Description**: Human-readable explanation

### Associate Lawyer Permissions (Base Set)

These permissions are **automatically inherited** by Case Manager and Admin Manager:

| Resource       | Action   | Description                                    |
|----------------|----------|------------------------------------------------|
| matter         | view     | View matters assigned to the user              |
| matter         | edit     | Edit matters assigned to the user              |
| document       | view     | View documents attached to assigned matters    |
| document       | create   | Upload documents to assigned matters           |
| document       | edit     | Edit/update documents in assigned matters      |
| document       | delete   | Delete documents from assigned matters         |
| note           | view     | View case notes for assigned matters           |
| note           | create   | Create case notes for assigned matters         |
| note           | edit     | Edit case notes for assigned matters           |
| timeline       | view     | View case timeline/activity                    |
| communication  | view     | View communications related to assigned matters|
| communication  | create   | Create communications for assigned matters     |
| evidence       | view     | View evidence for assigned matters             |
| evidence       | create   | Upload evidence for assigned matters           |
| filing         | view     | View court filings for assigned matters        |
| filing         | create   | Create court filings for assigned matters      |
| report         | create   | Submit court reports for assigned matters      |
| case_log       | view     | View activity logs for assigned matters        |
| client         | view     | View client information for assigned matters   |

### Case Manager Additional Permissions

These are **in addition to** all Associate Lawyer permissions:

| Resource       | Action         | Description                                    |
|----------------|----------------|------------------------------------------------|
| matter         | view_all       | View all matters in the firm                   |
| matter         | create         | Create new matters/cases                       |
| matter         | assign         | Assign matters to associate lawyers            |
| matter         | reassign       | Reassign matters between associates            |
| matter         | archive        | Archive completed matters                      |
| matter         | change_status  | Change matter status through workflow          |
| matter         | claim          | Claim matters from unassigned pool             |
| matter         | override_lock  | Override case locks or restrictions            |
| document       | view_all       | View all documents across all firm matters     |
| report         | view_workload  | View team workload and assignment reports      |
| report         | view_analytics | View case analytics and dashboards             |
| workflow       | manage         | Manage case workflow configurations            |

### Admin Manager Additional Permissions

These are **in addition to** all Case Manager and Associate Lawyer permissions:

| Resource       | Action         | Description                                    |
|----------------|----------------|------------------------------------------------|
| firm           | manage         | Manage firm settings and configuration         |
| user           | invite         | Invite new team members                        |
| user           | manage         | Manage team member accounts and roles          |
| user           | suspend        | Suspend user accounts                          |
| audit_log      | view           | View system audit logs                         |
| billing        | manage         | Manage firm billing and subscriptions          |
| report         | view_all       | Access all system reports and analytics        |
| matter         | delete         | Permanently delete matters (with restrictions) |

---

## Database Schema

### Core Tables

#### 1. `role_hierarchy`

Defines the role inheritance structure:

```sql
CREATE TABLE public.role_hierarchy (
    id UUID PRIMARY KEY,
    role TEXT UNIQUE NOT NULL,
    inherits_from TEXT[] DEFAULT '{}',
    level INTEGER UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. `permissions`

Stores all available permissions:

```sql
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(resource, action)
);
```

#### 3. `role_permissions`

Maps permissions to roles (direct assignments only):

```sql
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY,
    role TEXT NOT NULL,
    permission_id UUID REFERENCES permissions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role, permission_id)
);
```

### Key Functions

#### `get_role_permissions(p_role TEXT)`

Returns all permissions for a role, including inherited ones:

```sql
SELECT * FROM public.get_role_permissions('case_manager');
```

**Returns:**
- All permissions directly assigned to `case_manager`
- All permissions inherited from `associate_lawyer`

#### `user_has_permission(p_user_id UUID, p_resource TEXT, p_action TEXT)`

Checks if a user has a specific permission:

```sql
SELECT public.user_has_permission(
    auth.uid(), 
    'matter', 
    'assign'
);
```

---

## Backend Enforcement

### Row Level Security (RLS) Policies

All authorization is enforced server-side using PostgreSQL RLS policies.

#### Example: Matter View Policy

```sql
CREATE POLICY "Permission-based matter view"
ON public.matters FOR SELECT
USING (
    -- Case Managers can view all firm matters
    (
        public.user_has_permission(auth.uid(), 'matter', 'view_all')
        AND firm_id IN (SELECT firm_id FROM profiles WHERE id = auth.uid())
    )
    OR
    -- Associate Lawyers can view assigned matters
    (
        public.user_has_permission(auth.uid(), 'matter', 'view')
        AND EXISTS (
            SELECT 1 FROM case_assignments
            WHERE matter_id = matters.id AND associate_id = auth.uid()
        )
    )
);
```

### Audit Logging

All permission-based actions are logged:

```sql
SELECT public.log_permission_action(
    'matter_assigned',
    'matter',
    matter_id,
    jsonb_build_object('assigned_to', associate_id)
);
```

Audit logs include:
- Actor ID and role
- Permission used
- Resource and action
- Timestamp
- Additional context

---

## Frontend Integration

### Using the RBAC Library

```typescript
import { 
  hasPermission, 
  roleHasPermission,
  canAssignMatters,
  isCaseManagerOrHigher
} from '@/lib/rbac';

// Check if current user has permission
const canAssign = await hasPermission('matter', 'assign');

// Check if a specific role has permission (synchronous)
const roleCanEdit = roleHasPermission('case_manager', 'matter', 'edit');

// Use helper functions
if (canAssignMatters(userRole)) {
  // Show assignment UI
}
```

### Protected Routes

#### Using Role-Based Protection

```typescript
import ProtectedRouteRBAC from '@/components/ProtectedRouteRBAC';

<ProtectedRouteRBAC requiredRole="case_manager">
  <CaseManagementPage />
</ProtectedRouteRBAC>
```

#### Using Permission-Based Protection

```typescript
<ProtectedRouteRBAC 
  requiredPermission={{ resource: 'matter', action: 'assign' }}
>
  <AssignCasePage />
</ProtectedRouteRBAC>
```

#### Requiring Multiple Permissions

```typescript
<ProtectedRouteRBAC 
  requiredAllPermissions={[
    { resource: 'matter', action: 'view_all' },
    { resource: 'report', action: 'view_analytics' }
  ]}
>
  <AnalyticsDashboard />
</ProtectedRouteRBAC>
```

### Conditional UI Rendering

```typescript
import { roleHasPermission } from '@/lib/rbac';

function MatterDetailPage({ userRole }: { userRole: InternalRole }) {
  return (
    <div>
      {roleHasPermission(userRole, 'matter', 'assign') && (
        <button>Assign to Associate</button>
      )}
      
      {roleHasPermission(userRole, 'matter', 'edit') && (
        <button>Edit Matter</button>
      )}
    </div>
  );
}
```

---

## Permission Inheritance Mechanism

### How Inheritance Works

1. **Direct Assignment**: Permissions are assigned directly to the base role (`associate_lawyer`)
2. **Recursive Lookup**: When checking permissions for `case_manager`, the system:
   - Retrieves all permissions directly assigned to `case_manager`
   - Recursively retrieves all permissions from roles in `inherits_from` array
   - Combines and deduplicates the results
3. **Automatic Propagation**: When a new permission is added to `associate_lawyer`, it's automatically available to `case_manager` and `admin_manager`

### Inheritance Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  New Permission Added to Associate Lawyer                   │
│  INSERT INTO role_permissions (role, permission_id)         │
│  VALUES ('associate_lawyer', new_permission_id);            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  get_role_permissions('case_manager') is called             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Recursive CTE traverses role_hierarchy:                    │
│  1. Get case_manager's direct permissions                   │
│  2. Follow inherits_from → associate_lawyer                 │
│  3. Get associate_lawyer's permissions (includes new one)   │
│  4. Combine and return all permissions                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Case Manager now has the new permission automatically!     │
│  No manual updates required!                                │
└─────────────────────────────────────────────────────────────┘
```

### Code Example

```sql
-- Add new permission to Associate Lawyer
INSERT INTO permissions (name, resource, action, description)
VALUES ('view_case_analytics', 'analytics', 'view', 'View case analytics');

INSERT INTO role_permissions (role, permission_id)
SELECT 'associate_lawyer', id 
FROM permissions 
WHERE name = 'view_case_analytics';

-- Case Manager automatically gets this permission!
SELECT * FROM get_role_permissions('case_manager');
-- Returns: all case_manager permissions + all associate_lawyer permissions
--          including the newly added 'view_case_analytics'
```

---

## Usage Examples

### Example 1: Checking Matter Access

```typescript
// Backend (RLS Policy)
CREATE POLICY "matter_view_policy"
ON matters FOR SELECT
USING (
    user_has_permission(auth.uid(), 'matter', 'view_all')
    OR
    (
        user_has_permission(auth.uid(), 'matter', 'view')
        AND id IN (
            SELECT matter_id FROM case_assignments 
            WHERE associate_id = auth.uid()
        )
    )
);

// Frontend
import { canViewMatter } from '@/lib/rbac';

const isAssigned = matter.assignments?.some(a => a.associate_id === userId);
const isInFirm = matter.firm_id === userFirmId;

if (canViewMatter(userRole, isAssigned, isInFirm)) {
  // Render matter details
}
```

### Example 2: Case Assignment Feature

```typescript
// Only Case Managers and Admin Managers can assign cases
import { canAssignMatters } from '@/lib/rbac';

function AssignCaseButton({ userRole }: { userRole: InternalRole }) {
  if (!canAssignMatters(userRole)) {
    return null; // Hide button for Associate Lawyers
  }
  
  return (
    <button onClick={handleAssign}>
      Assign to Associate
    </button>
  );
}
```

### Example 3: Admin-Only Features

```typescript
import { canManageTeam, canViewAuditLogs } from '@/lib/rbac';

function AdminPanel({ userRole }: { userRole: InternalRole }) {
  return (
    <div>
      {canManageTeam(userRole) && (
        <Link to="/admin/team">Team Management</Link>
      )}
      
      {canViewAuditLogs(userRole) && (
        <Link to="/admin/audit-logs">Audit Logs</Link>
      )}
    </div>
  );
}
```

---

## Testing & Validation

### Validation Function

Run this to verify Case Manager inherits all Associate Lawyer permissions:

```sql
SELECT * FROM public.validate_role_inheritance();
```

**Expected Output:**
```
validation_status | missing_permissions
------------------+--------------------
PASS              | {}
```

If any permissions are missing, they will be listed in `missing_permissions`.

### Manual Verification Queries

#### 1. View All Role Permissions

```sql
SELECT * FROM public.role_permissions_effective 
ORDER BY role_level, resource, action;
```

#### 2. Compare Role Permissions

```sql
-- Get Associate Lawyer permissions
SELECT permission_name, resource, action 
FROM get_role_permissions('associate_lawyer')
ORDER BY resource, action;

-- Get Case Manager permissions
SELECT permission_name, resource, action 
FROM get_role_permissions('case_manager')
ORDER BY resource, action;

-- Case Manager should have ALL Associate Lawyer permissions plus more
```

#### 3. Test Specific User Permissions

```sql
SELECT 
    email,
    internal_role,
    permission_name,
    resource,
    action,
    assignment_type
FROM user_permissions
WHERE email = 'casemanager@example.com'
ORDER BY resource, action;
```

### Frontend Testing

```typescript
import { getRolePermissions } from '@/lib/rbac';

// Test in browser console
const associatePerms = await getRolePermissions('associate_lawyer');
const caseManagerPerms = await getRolePermissions('case_manager');

console.log('Associate Lawyer permissions:', associatePerms.length);
console.log('Case Manager permissions:', caseManagerPerms.length);

// Case Manager should have MORE permissions
console.assert(
  caseManagerPerms.length > associatePerms.length,
  'Case Manager should have more permissions than Associate Lawyer'
);

// Every Associate Lawyer permission should be in Case Manager permissions
const associatePermIds = new Set(associatePerms.map(p => p.permission_id));
const caseManagerPermIds = new Set(caseManagerPerms.map(p => p.permission_id));

associatePermIds.forEach(permId => {
  console.assert(
    caseManagerPermIds.has(permId),
    `Case Manager missing permission: ${permId}`
  );
});
```

---

## Future-Proofing

### Adding New Permissions to Associate Lawyer

When you add a new permission to Associate Lawyer, it **automatically** propagates to Case Manager:

```sql
-- Step 1: Create the permission
INSERT INTO permissions (name, resource, action, description)
VALUES (
    'export_case_data',
    'matter',
    'export',
    'Export case data to external formats'
);

-- Step 2: Assign to Associate Lawyer
INSERT INTO role_permissions (role, permission_id)
SELECT 'associate_lawyer', id 
FROM permissions 
WHERE name = 'export_case_data';

-- Step 3: Verify Case Manager has it (automatic!)
SELECT * FROM get_role_permissions('case_manager')
WHERE action = 'export';
-- ✅ Returns the new permission without any additional work!
```

### Edge Case: Associate Lawyer Loses Access

If an Associate Lawyer loses access to a specific case, Case Manager **retains access** because:

1. Case Managers have `view_all` permission for firm matters
2. RLS policies check for `view_all` OR `view + assigned`
3. Case Manager satisfies the `view_all` condition regardless of assignments

```sql
-- RLS Policy ensures this
CREATE POLICY "matter_view"
ON matters FOR SELECT
USING (
    user_has_permission(auth.uid(), 'matter', 'view_all')  -- Case Manager ✅
    OR
    (
        user_has_permission(auth.uid(), 'matter', 'view')   -- Associate ✅ only if assigned
        AND EXISTS (SELECT 1 FROM case_assignments WHERE ...)
    )
);
```

### Audit Trail for Role Actions

All actions are logged with the actor's role:

```sql
SELECT 
    created_at,
    actor_role,
    action,
    permission_used,
    details
FROM audit_logs
WHERE actor_role = 'case_manager'
ORDER BY created_at DESC;
```

This allows you to:
- Track which role performed which actions
- Distinguish Case Manager actions from Associate Lawyer actions
- Audit permission usage over time

---

## Summary

### ✅ Requirements Met

1. **Permission Inheritance**: Case Manager inherits 100% of Associate Lawyer permissions ✅
2. **Automatic Propagation**: New permissions added to Associate Lawyer automatically flow to Case Manager ✅
3. **Full Access Scope**: Case Manager can access all features available to Associate Lawyers ✅
4. **Server-Side Enforcement**: All authorization enforced via RLS policies ✅
5. **UI Alignment**: Frontend permission checks align with backend enforcement ✅
6. **Hierarchical Model**: Uses role hierarchy with automatic inheritance ✅
7. **Centralized Permissions**: All permissions defined in database, reusable across services ✅
8. **Edge Case Handling**: Case Manager retains access even when Associate loses it ✅
9. **Audit Logging**: All actions logged with role and permission context ✅
10. **Future-Proof**: System automatically handles new permissions ✅

### Key Files

- **Database Migration**: `supabase/migrations/rbac_role_hierarchy.sql`
- **Frontend Library**: `src/lib/rbac.ts`
- **Protected Route**: `src/components/ProtectedRouteRBAC.tsx`
- **Documentation**: This file

### Next Steps

1. **Run Migration**: Apply the RBAC migration to your database
2. **Update Routes**: Replace `ProtectedRoute` with `ProtectedRouteRBAC` where needed
3. **Test Inheritance**: Run validation queries to verify permission inheritance
4. **Update UI**: Use RBAC helper functions for conditional rendering
5. **Monitor Audit Logs**: Review audit logs to ensure proper permission usage

---

## Support

For questions or issues with the RBAC system:

1. Check the validation function: `SELECT * FROM validate_role_inheritance();`
2. Review audit logs for permission usage patterns
3. Verify RLS policies are enabled on all tables
4. Test permission checks in both frontend and backend

**Remember**: The database is the source of truth. All frontend checks are for UI optimization only; backend RLS policies provide the actual security enforcement.
