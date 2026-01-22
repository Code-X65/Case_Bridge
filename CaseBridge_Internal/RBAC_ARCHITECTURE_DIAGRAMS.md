# RBAC System Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CASEBRIDGE RBAC SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                      CLIENT LAYER                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │    │
│  │  │   React UI   │  │  Protected   │  │  Permission  │         │    │
│  │  │  Components  │  │    Routes    │  │   Checks     │         │    │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │    │
│  │         │                 │                  │                 │    │
│  │         └─────────────────┴──────────────────┘                 │    │
│  │                           │                                    │    │
│  │                           ▼                                    │    │
│  │                  ┌─────────────────┐                           │    │
│  │                  │  RBAC Library   │                           │    │
│  │                  │  (rbac.ts)      │                           │    │
│  │                  └────────┬────────┘                           │    │
│  └───────────────────────────┼─────────────────────────────────────┘    │
│                              │                                          │
│                              │ RPC Calls                                │
│                              ▼                                          │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    DATABASE LAYER                              │    │
│  │  ┌──────────────────────────────────────────────────────────┐  │    │
│  │  │              PostgreSQL + RLS Policies                   │  │    │
│  │  │                                                          │  │    │
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │  │    │
│  │  │  │    role_    │  │permissions  │  │    role_    │     │  │    │
│  │  │  │  hierarchy  │  │             │  │ permissions │     │  │    │
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘     │  │    │
│  │  │                                                          │  │    │
│  │  │  ┌──────────────────────────────────────────────────┐   │  │    │
│  │  │  │  get_role_permissions() - Recursive CTE          │   │  │    │
│  │  │  │  user_has_permission() - Permission Check        │   │  │    │
│  │  │  │  validate_role_inheritance() - Validation        │   │  │    │
│  │  │  └──────────────────────────────────────────────────┘   │  │    │
│  │  └──────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Role Hierarchy & Inheritance

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ROLE INHERITANCE TREE                           │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │  Admin Manager      │
                    │  (Level 1)          │
                    │                     │
                    │  Permissions: 35+   │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │ INHERITS ALL FROM           │
                └──────────────┬──────────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Case Manager       │
                    │  (Level 2)          │
                    │                     │
                    │  Permissions: 31    │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │ INHERITS ALL FROM           │
                └──────────────┬──────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Associate Lawyer    │
                    │ (Level 3)           │
                    │                     │
                    │  Permissions: 19    │
                    └─────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                  PERMISSION BREAKDOWN                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Associate Lawyer (19 base permissions)                             │
│  ├─ matter:view, edit                                               │
│  ├─ document:view, create, edit, delete                             │
│  ├─ note:view, create, edit                                         │
│  ├─ communication:view, create                                      │
│  ├─ evidence:view, create                                           │
│  ├─ filing:view, create                                             │
│  ├─ report:create                                                   │
│  ├─ case_log:view                                                   │
│  └─ client:view                                                     │
│                                                                      │
│  Case Manager (19 inherited + 12 additional = 31 total)             │
│  ├─ ALL Associate Lawyer permissions (inherited)                    │
│  └─ Additional:                                                     │
│     ├─ matter:view_all, create, assign, reassign                    │
│     ├─ matter:archive, change_status, claim, override_lock          │
│     ├─ document:view_all                                            │
│     └─ report:view_workload, view_analytics                         │
│     └─ workflow:manage                                              │
│                                                                      │
│  Admin Manager (31 inherited + 8 additional = 39 total)             │
│  ├─ ALL Case Manager permissions (inherited)                        │
│  ├─ ALL Associate Lawyer permissions (inherited)                    │
│  └─ Additional:                                                     │
│     ├─ firm:manage                                                  │
│     ├─ user:invite, manage, suspend                                 │
│     ├─ audit_log:view                                               │
│     ├─ billing:manage                                               │
│     ├─ report:view_all                                              │
│     └─ matter:delete                                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Permission Inheritance Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│        HOW CASE MANAGER INHERITS ASSOCIATE LAWYER PERMISSIONS       │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Permission Added to Associate Lawyer
┌──────────────────────────────────────────────────────────────┐
│ INSERT INTO role_permissions                                 │
│ VALUES ('associate_lawyer', 'view_assigned_matters');        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
Step 2: Database Stores Direct Assignment
┌──────────────────────────────────────────────────────────────┐
│ role_permissions table:                                      │
│ ┌─────────────────────┬──────────────────────────────────┐  │
│ │ role                │ permission_id                    │  │
│ ├─────────────────────┼──────────────────────────────────┤  │
│ │ associate_lawyer    │ uuid-for-view-assigned-matters   │  │
│ └─────────────────────┴──────────────────────────────────┘  │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
Step 3: Case Manager Permission Query
┌──────────────────────────────────────────────────────────────┐
│ SELECT * FROM get_role_permissions('case_manager');          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
Step 4: Recursive CTE Traversal
┌──────────────────────────────────────────────────────────────┐
│ WITH RECURSIVE role_chain AS (                               │
│   -- Start with case_manager                                 │
│   SELECT role, inherits_from FROM role_hierarchy             │
│   WHERE role = 'case_manager'                                │
│   -- inherits_from = ['associate_lawyer']                    │
│                                                               │
│   UNION ALL                                                  │
│                                                               │
│   -- Follow inheritance chain                                │
│   SELECT rh.role, rh.inherits_from                           │
│   FROM role_hierarchy rh                                     │
│   JOIN role_chain rc ON rh.role = ANY(rc.inherits_from)     │
│   -- Finds 'associate_lawyer'                                │
│ )                                                             │
│ SELECT permissions FROM role_chain                           │
│ JOIN role_permissions ON role = role_chain.role              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
Step 5: Result Returned
┌──────────────────────────────────────────────────────────────┐
│ Case Manager Permissions:                                    │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 1. view_assigned_matters (from associate_lawyer)         │ │
│ │ 2. edit_assigned_matters (from associate_lawyer)         │ │
│ │ 3. ... (all other associate_lawyer permissions)          │ │
│ │ 4. view_all_firm_matters (direct case_manager)           │ │
│ │ 5. assign_matters (direct case_manager)                  │ │
│ │ 6. ... (all other case_manager permissions)              │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                               │
│ ✅ Case Manager has ALL Associate Lawyer permissions!        │
└───────────────────────────────────────────────────────────────┘
```

---

## Access Control Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│              USER ATTEMPTS TO ACCESS A MATTER                       │
└─────────────────────────────────────────────────────────────────────┘

User Request: GET /api/matters/123
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Frontend: Check if UI should show matter                           │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ import { canViewMatter } from '@/lib/rbac';                │    │
│  │                                                            │    │
│  │ if (canViewMatter(userRole, isAssigned, isInFirm)) {      │    │
│  │   // Show matter details                                  │    │
│  │ }                                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Backend: RLS Policy Enforcement (SOURCE OF TRUTH)                  │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ CREATE POLICY "matter_view" ON matters FOR SELECT          │    │
│  │ USING (                                                    │    │
│  │   -- Case Manager can view all firm matters               │    │
│  │   user_has_permission(auth.uid(), 'matter', 'view_all')   │    │
│  │   AND firm_id = user_firm_id                              │    │
│  │   OR                                                       │    │
│  │   -- Associate can view assigned matters                  │    │
│  │   user_has_permission(auth.uid(), 'matter', 'view')       │    │
│  │   AND matter_id IN (assigned_matters)                     │    │
│  │ );                                                         │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Permission Check: user_has_permission()                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 1. Get user's role from profiles table                     │    │
│  │ 2. Call get_role_permissions(user_role)                    │    │
│  │ 3. Check if permission exists in result                    │    │
│  │ 4. Return true/false                                       │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Result                                                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ ALLOWED: User has permission, return matter data        │    │
│  │ ❌ DENIED: User lacks permission, return empty result      │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Relationships

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RBAC DATABASE SCHEMA                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  role_hierarchy     │
├─────────────────────┤
│ id (PK)             │
│ role (UNIQUE)       │◄──────────┐
│ inherits_from[]     │           │
│ level               │           │
│ description         │           │
└─────────────────────┘           │
                                  │
                                  │ References
                                  │
┌─────────────────────┐           │
│  permissions        │           │
├─────────────────────┤           │
│ id (PK)             │◄──┐       │
│ name (UNIQUE)       │   │       │
│ resource            │   │       │
│ action              │   │       │
│ description         │   │       │
└─────────────────────┘   │       │
                          │       │
                          │       │
                          │       │
┌─────────────────────┐   │       │
│ role_permissions    │   │       │
├─────────────────────┤   │       │
│ id (PK)             │   │       │
│ role                │───┼───────┘
│ permission_id (FK)  │───┘
│ created_at          │
└─────────────────────┘


┌─────────────────────┐
│  profiles           │
├─────────────────────┤
│ id (PK)             │
│ email               │
│ internal_role       │───┐ References role_hierarchy.role
│ firm_id (FK)        │   │
│ status              │   │
└─────────────────────┘   │
                          │
                          │
┌─────────────────────┐   │
│  audit_logs         │   │
├─────────────────────┤   │
│ id (PK)             │   │
│ firm_id (FK)        │   │
│ actor_id (FK)       │   │
│ actor_role          │───┘ Denormalized for performance
│ permission_used     │
│ action              │
│ details (JSONB)     │
│ created_at          │
└─────────────────────┘
```

---

## Permission Check Decision Tree

```
┌─────────────────────────────────────────────────────────────────────┐
│           SHOULD USER BE ABLE TO VIEW MATTER X?                     │
└─────────────────────────────────────────────────────────────────────┘

                    START
                      │
                      ▼
            ┌─────────────────────┐
            │ Is user             │
            │ authenticated?      │
            └─────────┬───────────┘
                      │
         ┌────────────┴────────────┐
         │ NO                      │ YES
         ▼                         ▼
    ┌─────────┐         ┌──────────────────────┐
    │ DENY    │         │ Is user status       │
    │ (401)   │         │ = 'active'?          │
    └─────────┘         └──────────┬───────────┘
                                   │
                      ┌────────────┴────────────┐
                      │ NO                      │ YES
                      ▼                         ▼
                 ┌─────────┐         ┌──────────────────────┐
                 │ DENY    │         │ What is user's       │
                 │ (403)   │         │ internal_role?       │
                 └─────────┘         └──────────┬───────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────┐
                    │                           │                       │
                    ▼                           ▼                       ▼
         ┌──────────────────┐      ┌──────────────────┐    ┌──────────────────┐
         │ Admin Manager    │      │ Case Manager     │    │ Associate Lawyer │
         └────────┬─────────┘      └────────┬─────────┘    └────────┬─────────┘
                  │                         │                       │
                  ▼                         ▼                       ▼
         ┌──────────────────┐      ┌──────────────────┐    ┌──────────────────┐
         │ Has permission:  │      │ Has permission:  │    │ Has permission:  │
         │ matter:view_all  │      │ matter:view_all  │    │ matter:view      │
         │ (inherited)      │      │ (direct)         │    │ (direct)         │
         └────────┬─────────┘      └────────┬─────────┘    └────────┬─────────┘
                  │                         │                       │
                  ▼                         ▼                       ▼
         ┌──────────────────┐      ┌──────────────────┐    ┌──────────────────┐
         │ Is matter in     │      │ Is matter in     │    │ Is user assigned │
         │ user's firm?     │      │ user's firm?     │    │ to matter?       │
         └────────┬─────────┘      └────────┬─────────┘    └────────┬─────────┘
                  │                         │                       │
         ┌────────┴────────┐       ┌────────┴────────┐     ┌────────┴────────┐
         │ YES             │       │ YES             │     │ YES             │
         ▼                 ▼       ▼                 ▼     ▼                 ▼
    ┌─────────┐       ┌─────────┐ ┌─────────┐  ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ ALLOW   │       │ DENY    │ │ ALLOW   │  │ DENY    │ │ ALLOW   │ │ DENY    │
    │ (200)   │       │ (403)   │ │ (200)   │  │ (403)   │ │ (200)   │ │ (403)   │
    └─────────┘       └─────────┘ └─────────┘  └─────────┘ └─────────┘ └─────────┘

KEY INSIGHT:
- Admin Manager & Case Manager can view ALL firm matters (view_all permission)
- Associate Lawyer can ONLY view matters they're assigned to (view permission)
- Case Manager inherits Associate Lawyer's view permission BUT ALSO has view_all
- This ensures Case Manager can access matters even if Associate loses access
```

---

## Audit Trail Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                  AUDIT LOGGING FLOW                                 │
└─────────────────────────────────────────────────────────────────────┘

User Action: Assign Matter to Associate
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Application Code                                                    │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ await supabase.rpc('assign_matter', {                      │    │
│  │   matter_id: '123',                                        │    │
│  │   associate_id: '456'                                      │    │
│  │ });                                                        │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Database Function: assign_matter()                                 │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ 1. Check permission:                                       │    │
│  │    IF NOT user_has_permission(auth.uid(), 'matter',        │    │
│  │                               'assign') THEN               │    │
│  │      RAISE EXCEPTION 'Insufficient permissions'            │    │
│  │                                                            │    │
│  │ 2. Perform assignment:                                     │    │
│  │    INSERT INTO case_assignments ...                        │    │
│  │                                                            │    │
│  │ 3. Log action:                                             │    │
│  │    PERFORM log_permission_action(...)                      │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Audit Log Entry Created                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ {                                                          │    │
│  │   firm_id: "firm-uuid",                                    │    │
│  │   actor_id: "user-uuid",                                   │    │
│  │   actor_role: "case_manager",                              │    │
│  │   action: "matter_assigned",                               │    │
│  │   permission_used: "matter:assign",                        │    │
│  │   details: {                                               │    │
│  │     resource: "matter",                                    │    │
│  │     resource_id: "123",                                    │    │
│  │     assigned_to: "456"                                     │    │
│  │   },                                                       │    │
│  │   created_at: "2026-01-18T19:41:13Z"                       │    │
│  │ }                                                          │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘

Benefits:
✅ Clear record of WHO (actor_id, actor_role)
✅ Clear record of WHAT (action, permission_used)
✅ Clear record of WHEN (created_at)
✅ Clear record of CONTEXT (details JSONB)
✅ Can distinguish Case Manager actions from Associate Lawyer actions
```

---

## Future-Proofing Example

```
┌─────────────────────────────────────────────────────────────────────┐
│     ADDING NEW FEATURE: EXPORT CASE DATA                            │
└─────────────────────────────────────────────────────────────────────┘

Day 1: Product decides Associate Lawyers need export capability
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Developer adds permission to Associate Lawyer                      │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ INSERT INTO permissions (name, resource, action)           │    │
│  │ VALUES ('export_case_data', 'matter', 'export');           │    │
│  │                                                            │    │
│  │ INSERT INTO role_permissions (role, permission_id)         │    │
│  │ SELECT 'associate_lawyer', id FROM permissions             │    │
│  │ WHERE name = 'export_case_data';                           │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  AUTOMATIC INHERITANCE                                              │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ Associate Lawyer: has export permission (direct)        │    │
│  │ ✅ Case Manager: has export permission (inherited)         │    │
│  │ ✅ Admin Manager: has export permission (inherited)        │    │
│  │                                                            │    │
│  │ NO ADDITIONAL CODE NEEDED!                                 │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Developer implements export feature                                │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ // Frontend                                                │    │
│  │ if (roleHasPermission(userRole, 'matter', 'export')) {     │    │
│  │   <ExportButton />                                         │    │
│  │ }                                                          │    │
│  │                                                            │    │
│  │ // Backend RLS                                             │    │
│  │ CREATE POLICY "export_policy" ON matter_exports            │    │
│  │ FOR INSERT USING (                                         │    │
│  │   user_has_permission(auth.uid(), 'matter', 'export')      │    │
│  │ );                                                         │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Result: All roles have export capability automatically!            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ ✅ Associate Lawyer can export their assigned cases        │    │
│  │ ✅ Case Manager can export all firm cases                  │    │
│  │ ✅ Admin Manager can export all firm cases                 │    │
│  │                                                            │    │
│  │ Zero manual permission updates required!                   │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Summary

This RBAC system ensures:

1. **Automatic Inheritance**: Case Manager gets ALL Associate Lawyer permissions automatically
2. **Future-Proof**: New permissions added to Associate Lawyer flow up automatically
3. **Server-Side Enforcement**: Database RLS policies are the source of truth
4. **Audit Trail**: All actions logged with role and permission context
5. **Flexible**: Supports both role-based and permission-based access control
6. **Maintainable**: Centralized permission definitions, no duplication

**Key Principle**: The database is the single source of truth for all authorization decisions.
