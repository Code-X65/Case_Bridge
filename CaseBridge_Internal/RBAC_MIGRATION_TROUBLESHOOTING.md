# RBAC Migration - Troubleshooting Guide

## Error: "column is_assigned does not exist"

This error occurred because the migration tried to create an RLS policy on a table that doesn't exist yet.

## Solution

The migration has been updated to comment out the `documents` table policy. Here's what was changed:

### Before:
```sql
-- Documents view policy
DROP POLICY IF EXISTS "Permission-based document view" ON public.documents;
CREATE POLICY "Permission-based document view"
...
```

### After:
```sql
-- Documents view policy (only if documents table exists)
-- Uncomment the following if you have a documents table:
/*
DROP POLICY IF EXISTS "Permission-based document view" ON public.documents;
CREATE POLICY "Permission-based document view"
...
*/
```

## How to Apply the Migration

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `supabase/migrations/rbac_role_hierarchy.sql`
4. Paste into the SQL editor
5. Click **Run**

### Option 2: Using psql (if you have direct database access)

```bash
psql -h your-db-host -U your-db-user -d your-db-name -f supabase/migrations/rbac_role_hierarchy.sql
```

### Option 3: Using a SQL client (DBeaver, pgAdmin, etc.)

1. Connect to your database
2. Open the migration file
3. Execute the SQL

## After Migration

### Verify Installation

Run these queries to verify everything is working:

```sql
-- 1. Check role hierarchy
SELECT * FROM role_hierarchy ORDER BY level;

-- 2. Validate inheritance
SELECT * FROM validate_role_inheritance();
-- Expected: validation_status = 'PASS'

-- 3. View permissions
SELECT 
    role,
    COUNT(*) as total_permissions,
    COUNT(*) FILTER (WHERE assignment_type = 'direct') as direct,
    COUNT(*) FILTER (WHERE assignment_type = 'inherited') as inherited
FROM role_permissions_effective
GROUP BY role
ORDER BY role_level;
```

Expected output for step 3:
```
role              | total_permissions | direct | inherited
------------------+-------------------+--------+-----------
admin_manager     | 39                | 8      | 31
case_manager      | 31                | 12     | 19
associate_lawyer  | 19                | 19     | 0
```

## If You Have a Documents Table

If your database has a `documents` table with a `matter_id` column, you can uncomment the documents policy in the migration file:

1. Open `supabase/migrations/rbac_role_hierarchy.sql`
2. Find the commented section (around line 345)
3. Remove the `/*` and `*/` comment markers
4. Re-run the migration or just run that specific policy creation

## Common Issues

### Issue: "relation does not exist"

**Cause**: The migration references a table that doesn't exist yet.

**Solution**: 
- Comment out policies for non-existent tables
- Create the tables first, then uncomment the policies
- Or manually create policies later when tables exist

### Issue: "permission denied"

**Cause**: Your database user doesn't have sufficient privileges.

**Solution**: 
- Use a superuser account to run the migration
- Or grant necessary privileges: `GRANT ALL ON SCHEMA public TO your_user;`

### Issue: "function already exists"

**Cause**: You're running the migration multiple times.

**Solution**: 
- This is fine! The migration uses `CREATE OR REPLACE FUNCTION`
- The migration is idempotent and can be run multiple times safely

## Next Steps

After successful migration:

1. ✅ Run validation: `SELECT * FROM validate_role_inheritance();`
2. ✅ Check permissions: `SELECT * FROM role_permissions_effective;`
3. ✅ Test with a user: `SELECT * FROM user_permissions WHERE email = 'your-email';`
4. ✅ Update your frontend to use the RBAC library
5. ✅ Test all three roles thoroughly

## Need Help?

Check these files:
- `RBAC_README.md` - Getting started guide
- `RBAC_QUICK_REFERENCE.md` - Common operations
- `RBAC_IMPLEMENTATION_GUIDE.md` - Complete documentation
