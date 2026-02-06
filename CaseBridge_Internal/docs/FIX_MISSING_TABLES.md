# 🚨 URGENT: Fix "relation public.firms does not exist" Error

## Problem
Your Supabase database is missing the core tables (firms, profiles, etc.) needed for the application to work.

## Solution: Run the Emergency Migration

### Step 1: Open Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **CaseBridge Internal**

### Step 2: Open SQL Editor
1. Click on **SQL Editor** in the left sidebar
2. Click **New query** button

### Step 3: Run the Migration
1. Open the file: `supabase/EMERGENCY_CREATE_TABLES.sql`
2. **Copy ALL the contents** of that file
3. **Paste** into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 4: Verify Success
You should see a success message:
```
✅ Core tables created successfully!
```

### Step 5: Test Your Application
1. Go back to your application
2. Try registering a firm again
3. The error should be gone! ✅

---

## What This Script Does

The emergency migration creates these essential tables:

1. **firms** - Stores law firm information
2. **profiles** - User profile data (extends auth.users)
3. **user_firm_roles** - Maps users to firms with roles
4. **invitations** - Staff invitation system
5. **internal_sessions** - Firm-scoped sessions
6. **pending_firm_registrations** - Registration workflow data

It also sets up:
- ✅ Row Level Security (RLS) policies
- ✅ Helper functions for permissions
- ✅ Proper foreign key relationships
- ✅ Check constraints for data integrity

---

## Alternative: Install Supabase CLI (Optional)

If you want to use migrations properly in the future:

### Install Supabase CLI
```powershell
# Using npm
npm install -g supabase

# Or using Scoop (Windows package manager)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Link to Your Project
```powershell
cd c:\dev\Casebridge\CaseBridge_Internal
supabase link --project-ref YOUR_PROJECT_REF
```

### Run All Migrations
```powershell
supabase db push
```

---

## Why This Happened

Your local migrations folder has all the SQL files, but they haven't been applied to your Supabase database yet. This typically happens when:

1. The project was set up locally but migrations weren't pushed to Supabase
2. The database was reset without re-running migrations
3. Supabase CLI wasn't used to sync the schema

---

## Next Steps After Fix

Once the tables are created, you should be able to:

✅ Register new firms
✅ Create user accounts
✅ Login to the internal portal
✅ Manage staff and invitations
✅ Create matters and cases

---

## Need Help?

If you encounter any errors:
1. Check the error message in the SQL Editor
2. Make sure you're running the script in the correct Supabase project
3. Verify you have the necessary permissions (you should be the project owner)

---

**Status:** Ready to run! 🚀
**File Location:** `supabase/EMERGENCY_CREATE_TABLES.sql`
