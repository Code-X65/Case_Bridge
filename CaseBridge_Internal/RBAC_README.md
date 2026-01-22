# 🔐 RBAC System - Getting Started

## Quick Overview

This RBAC (Role-Based Access Control) system ensures that **Case Managers automatically inherit 100% of Associate Lawyer permissions** through a hierarchical role inheritance model.

## 🎯 What This Solves

- ✅ Case Manager has full access to all Associate Lawyer features
- ✅ New permissions added to Associate Lawyer automatically flow to Case Manager
- ✅ Server-side enforcement prevents unauthorized access
- ✅ Audit trail tracks all permission-based actions
- ✅ Future-proof: No manual updates needed when adding permissions

## 📁 Files Created

| File | Purpose |
|------|---------|
| `supabase/migrations/rbac_role_hierarchy.sql` | Database schema and migration |
| `src/lib/rbac.ts` | Frontend RBAC utilities |
| `src/components/ProtectedRouteRBAC.tsx` | Enhanced protected route component |
| `RBAC_IMPLEMENTATION_GUIDE.md` | Comprehensive implementation guide |
| `RBAC_QUICK_REFERENCE.md` | Developer quick reference |
| `RBAC_ARCHITECTURE_DIAGRAMS.md` | Visual architecture diagrams |
| `RBAC_IMPLEMENTATION_SUMMARY.md` | High-level summary |
| `RBAC_README.md` | This file |

## 🚀 Installation

### Step 1: Apply Database Migration

```bash
cd CaseBridge_Internal

# If using Supabase CLI
supabase db push

# Or manually run the migration file in your database
# File: supabase/migrations/rbac_role_hierarchy.sql
```

### Step 2: Verify Installation

```sql
-- Run this in your database
SELECT * FROM validate_role_inheritance();
```

**Expected Output**:
```
validation_status | missing_permissions
------------------+--------------------
PASS              | {}
```

### Step 3: View Permissions

```sql
-- See all permissions for each role
SELECT 
    role,
    COUNT(*) as total_permissions,
    COUNT(*) FILTER (WHERE assignment_type = 'direct') as direct,
    COUNT(*) FILTER (WHERE assignment_type = 'inherited') as inherited
FROM role_permissions_effective
GROUP BY role
ORDER BY role_level;
```

**Expected Output**:
```
role              | total_permissions | direct | inherited
------------------+-------------------+--------+-----------
admin_manager     | 39                | 8      | 31
case_manager      | 31                | 12     | 19
associate_lawyer  | 19                | 19     | 0
```

## 📚 Documentation Guide

Start with these documents in order:

1. **First Time**: Read `RBAC_IMPLEMENTATION_SUMMARY.md` for high-level overview
2. **Quick Tasks**: Use `RBAC_QUICK_REFERENCE.md` for common operations
3. **Deep Dive**: Read `RBAC_IMPLEMENTATION_GUIDE.md` for complete details
4. **Visual Learner**: Check `RBAC_ARCHITECTURE_DIAGRAMS.md` for flowcharts

## 🎓 Quick Examples

### Check Permission (Frontend)

```typescript
import { hasPermission, roleHasPermission } from '@/lib/rbac';

// Async check for current user
const canAssign = await hasPermission('matter', 'assign');

// Sync check for a role
const roleCanEdit = roleHasPermission('case_manager', 'matter', 'edit');
```

### Protect a Route

```typescript
import ProtectedRouteRBAC from '@/components/ProtectedRouteRBAC';

<ProtectedRouteRBAC 
  requiredPermission={{ resource: 'matter', action: 'assign' }}
>
  <AssignCasePage />
</ProtectedRouteRBAC>
```

### Conditional Rendering

```typescript
import { canAssignMatters } from '@/lib/rbac';

{canAssignMatters(userRole) && <AssignButton />}
```

### Backend Permission Check

```sql
-- In a PostgreSQL function
IF NOT user_has_permission(auth.uid(), 'matter', 'assign') THEN
    RAISE EXCEPTION 'Insufficient permissions';
END IF;
```

## 🧪 Testing Checklist

### Database Tests

- [ ] Migration applied successfully
- [ ] `validate_role_inheritance()` returns PASS
- [ ] All three roles exist in `role_hierarchy`
- [ ] Permissions seeded correctly
- [ ] RLS policies enabled on all tables

### Frontend Tests

- [ ] RBAC library imports without errors
- [ ] `hasPermission()` works for different permissions
- [ ] `roleHasPermission()` works for all roles
- [ ] Protected routes block unauthorized access
- [ ] Conditional rendering shows/hides correctly

### Integration Tests

- [ ] Associate Lawyer can only see assigned matters
- [ ] Case Manager can see all firm matters
- [ ] Case Manager can assign cases
- [ ] Admin Manager can access admin features
- [ ] Audit logs record actions with correct roles

## 🔍 Verification Queries

### Check Role Hierarchy

```sql
SELECT * FROM role_hierarchy ORDER BY level;
```

### View All Permissions

```sql
SELECT * FROM permissions ORDER BY resource, action;
```

### See Effective Permissions by Role

```sql
SELECT 
    role,
    permission_name,
    resource,
    action,
    assignment_type
FROM role_permissions_effective
WHERE role = 'case_manager'
ORDER BY resource, action;
```

### Check User Permissions

```sql
SELECT * FROM user_permissions 
WHERE email = 'your-email@example.com'
ORDER BY resource, action;
```

## 🆘 Troubleshooting

### Issue: Migration fails

**Solution**: 
1. Check if tables already exist
2. Ensure you're connected to the correct database
3. Check for syntax errors in migration file
4. Review database logs for specific errors

### Issue: `validate_role_inheritance()` returns FAIL

**Solution**:
```sql
-- See which permissions are missing
SELECT * FROM validate_role_inheritance();

-- Check role hierarchy
SELECT * FROM role_hierarchy;

-- Verify permissions exist
SELECT * FROM permissions;

-- Check role_permissions mappings
SELECT * FROM role_permissions;
```

### Issue: Frontend permission checks not working

**Solution**:
1. Clear permission cache: `clearPermissionCache()`
2. Check user's role: `SELECT internal_role FROM profiles WHERE id = auth.uid()`
3. Verify RPC functions exist: `SELECT * FROM pg_proc WHERE proname = 'get_role_permissions'`
4. Check browser console for errors

### Issue: Backend blocks action but frontend shows UI

**Solution**:
- This is expected! Frontend checks are UI hints only
- Backend RLS policies are the authoritative enforcement
- Ensure frontend checks match backend policies
- Check user session is valid

## 📝 Adding New Permissions

### Quick Process

1. **Create Permission**:
```sql
INSERT INTO permissions (name, resource, action, description)
VALUES ('export_data', 'matter', 'export', 'Export case data');
```

2. **Assign to Base Role**:
```sql
INSERT INTO role_permissions (role, permission_id)
SELECT 'associate_lawyer', id FROM permissions WHERE name = 'export_data';
```

3. **Verify Inheritance** (automatic!):
```sql
SELECT * FROM get_role_permissions('case_manager')
WHERE action = 'export';
-- Should return the new permission
```

4. **Update Frontend** (optional):
```typescript
// In src/lib/rbac.ts
export const ASSOCIATE_LAWYER_PERMISSIONS = [
  // ... existing
  { resource: 'matter', action: 'export' },
];
```

## 🎯 Key Concepts

### Role Hierarchy

```
Admin Manager (Level 1)
    ↓ inherits ALL from
Case Manager (Level 2)
    ↓ inherits ALL from
Associate Lawyer (Level 3)
```

### Permission Structure

Each permission has:
- **Resource**: What is being accessed (e.g., `matter`, `document`)
- **Action**: What operation is performed (e.g., `view`, `edit`, `create`)

### Inheritance Mechanism

1. Permissions assigned to base role (Associate Lawyer)
2. `get_role_permissions()` recursively fetches inherited permissions
3. Higher roles automatically get lower role permissions
4. No manual updates needed

## 📖 Further Reading

- **Complete Guide**: `RBAC_IMPLEMENTATION_GUIDE.md`
- **Quick Reference**: `RBAC_QUICK_REFERENCE.md`
- **Architecture**: `RBAC_ARCHITECTURE_DIAGRAMS.md`
- **Summary**: `RBAC_IMPLEMENTATION_SUMMARY.md`

## 💡 Best Practices

1. ✅ Always enforce permissions on backend (RLS policies)
2. ✅ Use permission-based checks over role checks when possible
3. ✅ Log important actions with `log_permission_action()`
4. ✅ Run `validate_role_inheritance()` after schema changes
5. ✅ Clear permission cache on user logout
6. ✅ Test with all three roles before deploying
7. ✅ Document new permissions in this guide

## 🎉 Success Criteria

Your RBAC system is working correctly if:

- ✅ `validate_role_inheritance()` returns PASS
- ✅ Case Manager can access all Associate Lawyer features
- ✅ New permissions added to Associate Lawyer appear in Case Manager permissions
- ✅ RLS policies enforce access control
- ✅ Audit logs record actions with role information
- ✅ Frontend UI aligns with backend permissions

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the comprehensive guide: `RBAC_IMPLEMENTATION_GUIDE.md`
3. Run validation queries to identify the problem
4. Check database logs and browser console for errors

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-18  
**Status**: Production Ready ✅

**Remember**: The database is the single source of truth for all authorization decisions!
