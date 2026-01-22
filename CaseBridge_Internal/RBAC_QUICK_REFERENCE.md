# RBAC Quick Reference Guide

## 🎯 Quick Start

### Check if User Has Permission (Frontend)

```typescript
import { hasPermission, roleHasPermission } from '@/lib/rbac';

// Async check for current user
const canAssign = await hasPermission('matter', 'assign');

// Sync check for a specific role
const roleCanEdit = roleHasPermission('case_manager', 'matter', 'edit');
```

### Protect a Route

```typescript
import ProtectedRouteRBAC from '@/components/ProtectedRouteRBAC';

// By role
<ProtectedRouteRBAC requiredRole="case_manager">
  <YourPage />
</ProtectedRouteRBAC>

// By permission
<ProtectedRouteRBAC 
  requiredPermission={{ resource: 'matter', action: 'assign' }}
>
  <YourPage />
</ProtectedRouteRBAC>
```

### Conditional Rendering

```typescript
import { canAssignMatters, isCaseManagerOrHigher } from '@/lib/rbac';

{canAssignMatters(userRole) && <AssignButton />}
{isCaseManagerOrHigher(userRole) && <AdminPanel />}
```

---

## 📊 Role Hierarchy

```
Admin Manager (Level 1)
    ↓ inherits ALL from
Case Manager (Level 2)
    ↓ inherits ALL from
Associate Lawyer (Level 3)
```

---

## 🔑 Common Permissions

### Associate Lawyer (Base)
- `matter:view` - View assigned matters
- `matter:edit` - Edit assigned matters
- `document:view/create/edit/delete` - Document management
- `note:view/create/edit` - Case notes
- `communication:view/create` - Communications
- `evidence:view/create` - Evidence management
- `filing:view/create` - Court filings
- `client:view` - Client information

### Case Manager (+ All Associate Lawyer)
- `matter:view_all` - View ALL firm matters
- `matter:create` - Create new matters
- `matter:assign` - Assign to associates
- `matter:reassign` - Reassign cases
- `matter:archive` - Archive matters
- `matter:change_status` - Update status
- `matter:claim` - Claim unassigned
- `document:view_all` - View all documents
- `report:view_workload` - Team workload
- `report:view_analytics` - Analytics

### Admin Manager (+ All Case Manager + Associate Lawyer)
- `firm:manage` - Firm settings
- `user:invite/manage/suspend` - Team management
- `audit_log:view` - Audit logs
- `billing:manage` - Billing
- `report:view_all` - All reports
- `matter:delete` - Delete matters

---

## 🛠️ Helper Functions

### Role Checks

```typescript
import { 
  isAdmin, 
  isCaseManagerOrHigher,
  roleInheritsFrom,
  roleHasEqualOrHigherPrivilege
} from '@/lib/rbac';

isAdmin('admin_manager') // true
isCaseManagerOrHigher('case_manager') // true
isCaseManagerOrHigher('associate_lawyer') // false

roleInheritsFrom('case_manager', 'associate_lawyer') // true
roleHasEqualOrHigherPrivilege('case_manager', 'associate_lawyer') // true
```

### Permission Checks

```typescript
import { 
  canViewMatter,
  canEditMatter,
  canAssignMatters,
  canManageTeam,
  canViewAuditLogs
} from '@/lib/rbac';

canViewMatter(userRole, isAssigned, isInFirm)
canEditMatter(userRole, isAssigned, isInFirm)
canAssignMatters(userRole)
canManageTeam(userRole)
canViewAuditLogs(userRole)
```

---

## 🗄️ Database Functions

### Get Role Permissions

```sql
-- Get all permissions for a role (including inherited)
SELECT * FROM get_role_permissions('case_manager');
```

### Check User Permission

```sql
-- Check if user has specific permission
SELECT user_has_permission(
    auth.uid(), 
    'matter', 
    'assign'
);
```

### Validate Inheritance

```sql
-- Verify Case Manager inherits all Associate Lawyer permissions
SELECT * FROM validate_role_inheritance();
-- Expected: validation_status = 'PASS', missing_permissions = {}
```

### View Effective Permissions

```sql
-- See all permissions for all roles
SELECT * FROM role_permissions_effective 
ORDER BY role_level, resource, action;

-- See permissions for a specific user
SELECT * FROM user_permissions 
WHERE email = 'user@example.com';
```

---

## 📝 Adding New Permissions

### Step 1: Create Permission

```sql
INSERT INTO permissions (name, resource, action, description)
VALUES (
    'new_permission_name',
    'resource_type',
    'action_type',
    'Description of what this allows'
);
```

### Step 2: Assign to Role

```sql
-- Assign to Associate Lawyer (Case Manager inherits automatically!)
INSERT INTO role_permissions (role, permission_id)
SELECT 'associate_lawyer', id 
FROM permissions 
WHERE name = 'new_permission_name';
```

### Step 3: Verify Inheritance

```sql
-- Check Case Manager has it
SELECT * FROM get_role_permissions('case_manager')
WHERE action = 'action_type';
```

### Step 4: Update Frontend Constants (Optional)

```typescript
// In src/lib/rbac.ts
export const ASSOCIATE_LAWYER_PERMISSIONS = [
  // ... existing permissions
  { resource: 'resource_type', action: 'action_type' },
];
```

---

## 🧪 Testing Checklist

### Backend Testing

- [ ] Run migration: `supabase db push`
- [ ] Validate inheritance: `SELECT * FROM validate_role_inheritance();`
- [ ] Check role permissions: `SELECT * FROM role_permissions_effective;`
- [ ] Test RLS policies with different roles
- [ ] Verify audit logging works

### Frontend Testing

- [ ] Import RBAC utilities without errors
- [ ] Test `hasPermission()` with different permissions
- [ ] Test `roleHasPermission()` for all roles
- [ ] Verify protected routes block unauthorized access
- [ ] Check conditional rendering shows/hides correctly
- [ ] Test permission cache clearing on logout

### Integration Testing

- [ ] Associate Lawyer can only see assigned matters
- [ ] Case Manager can see all firm matters
- [ ] Case Manager can assign cases
- [ ] Admin Manager can access admin features
- [ ] Audit logs record actions with correct roles
- [ ] New permissions propagate automatically

---

## 🚨 Common Issues

### Issue: Permission check returns false unexpectedly

**Solution:**
1. Check user's role: `SELECT internal_role FROM profiles WHERE id = auth.uid();`
2. Verify permission exists: `SELECT * FROM permissions WHERE resource = 'X' AND action = 'Y';`
3. Check role has permission: `SELECT * FROM get_role_permissions('role_name');`
4. Clear permission cache: `clearPermissionCache();`

### Issue: Case Manager can't access Associate Lawyer features

**Solution:**
1. Run validation: `SELECT * FROM validate_role_inheritance();`
2. Check role hierarchy: `SELECT * FROM role_hierarchy;`
3. Verify RLS policies use `user_has_permission()` function
4. Check if user status is 'active'

### Issue: Frontend shows UI but backend blocks action

**Solution:**
- Frontend checks are hints only; backend is authoritative
- Ensure frontend permission checks match backend RLS policies
- Check browser console for permission errors
- Verify user session is valid

---

## 📚 Resources

- **Full Documentation**: `RBAC_IMPLEMENTATION_GUIDE.md`
- **Migration File**: `supabase/migrations/rbac_role_hierarchy.sql`
- **Frontend Library**: `src/lib/rbac.ts`
- **Protected Route**: `src/components/ProtectedRouteRBAC.tsx`

---

## 💡 Best Practices

1. **Always enforce on backend**: Frontend checks are for UX only
2. **Use permission-based checks**: Prefer `hasPermission()` over role checks
3. **Log important actions**: Use `log_permission_action()` for audit trail
4. **Test inheritance**: Run `validate_role_inheritance()` after changes
5. **Clear cache on logout**: Call `clearPermissionCache()` when user logs out
6. **Document new permissions**: Update this guide when adding permissions
7. **Use helper functions**: Don't duplicate permission logic

---

## 🎓 Examples

### Example 1: Feature Flag Based on Permission

```typescript
import { roleHasPermission } from '@/lib/rbac';

function MatterActions({ userRole, matter }) {
  const canAssign = roleHasPermission(userRole, 'matter', 'assign');
  const canArchive = roleHasPermission(userRole, 'matter', 'archive');
  
  return (
    <div>
      {canAssign && <AssignButton matter={matter} />}
      {canArchive && <ArchiveButton matter={matter} />}
    </div>
  );
}
```

### Example 2: Multi-Permission Route

```typescript
<ProtectedRouteRBAC 
  requiredAllPermissions={[
    { resource: 'report', action: 'view_analytics' },
    { resource: 'matter', action: 'view_all' }
  ]}
>
  <AnalyticsDashboard />
</ProtectedRouteRBAC>
```

### Example 3: Backend Permission Check

```sql
-- In a PostgreSQL function
CREATE OR REPLACE FUNCTION assign_matter(
    p_matter_id UUID,
    p_associate_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check permission
    IF NOT user_has_permission(auth.uid(), 'matter', 'assign') THEN
        RAISE EXCEPTION 'Insufficient permissions to assign matters';
    END IF;
    
    -- Perform assignment
    INSERT INTO case_assignments (matter_id, associate_id, assigned_by)
    VALUES (p_matter_id, p_associate_id, auth.uid());
    
    -- Log action
    PERFORM log_permission_action(
        'matter_assigned',
        'matter',
        p_matter_id,
        jsonb_build_object('assigned_to', p_associate_id)
    );
    
    RETURN jsonb_build_object('success', true);
END;
$$;
```

---

## 🔄 Migration Checklist

### Migrating from Old System

- [ ] Backup database before migration
- [ ] Run RBAC migration: `rbac_role_hierarchy.sql`
- [ ] Verify all users have correct `internal_role` set
- [ ] Test existing features still work
- [ ] Update frontend to use new RBAC utilities
- [ ] Replace old `ProtectedRoute` with `ProtectedRouteRBAC`
- [ ] Update permission checks in components
- [ ] Test all user roles thoroughly
- [ ] Monitor audit logs for issues
- [ ] Document any custom permissions added

---

**Last Updated**: 2026-01-18
**Version**: 1.0.0
