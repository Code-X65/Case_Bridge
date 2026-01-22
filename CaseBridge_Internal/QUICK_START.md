# 🚀 CASEBRIDGE INTERNAL PLATFORM - QUICK START

## 📋 SYSTEM ARCHITECTURE

**Important Notes:**
- ✅ **Single Firm**: CaseBridge (only one firm in the system)
- ✅ **Single Admin**: System Administrator (created via SQL, not invitation)
- ✅ **Multiple Users**: Case Managers and Associates (invited by admin)

---

## 🔧 INITIAL SETUP (Run Once)

### **Step 1: Run Database Migration**

In **Supabase SQL Editor**, execute:

```sql
-- File: supabase/migrations/internal_schema.sql
-- Copy and paste the entire file contents
```

This creates all tables, RLS policies, and triggers.

---

### **Step 2: Create CaseBridge Firm**

In **Supabase SQL Editor**, run:

```sql
INSERT INTO public.firms (
    id,
    name,
    email,
    phone,
    address
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'CaseBridge',
    'admin@casebridge.com',
    '+234-800-CASEBRIDGE',
    'Lagos, Nigeria'
)
ON CONFLICT (id) DO NOTHING;
```

---

### **Step 3: Create System Admin User**

#### **3a. Create Auth User in Supabase Dashboard**

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - **Email**: `admin@casebridge.com` (or your preferred email)
   - **Password**: Choose a strong password
   - **Auto Confirm User**: ✅ Check this box
4. Click **"Create User"**
5. **Copy the User ID** (you'll need it in the next step)

#### **3b. Set Up Admin Profile**

In **Supabase SQL Editor**, run:

```sql
-- Replace <ADMIN_USER_ID> with the User ID you copied above

INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    firm_id,
    internal_role,
    status
)
VALUES (
    '6f9e0a6e-8d74-4ddc-aa0f-3a30a6c124fa',  -- Replace this!
    'admin@casebridge.com',
    'System',
    'Administrator',
    '00000000-0000-0000-0000-000000000001',
    'admin_manager',
    'active'
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    firm_id = EXCLUDED.firm_id,
    internal_role = EXCLUDED.internal_role,
    status = EXCLUDED.status;
```

---

### **Step 4: Verify Setup**

Run this SQL to confirm everything is correct:

```sql
SELECT 
    'FIRM' as type,
    id,
    name,
    email
FROM public.firms
WHERE id = '00000000-0000-0000-0000-000000000001'

UNION ALL

SELECT 
    'ADMIN' as type,
    id,
    first_name || ' ' || last_name as name,
    email
FROM public.profiles
WHERE internal_role = 'admin_manager';
```

**Expected Results:**
```
type  | id                                   | name                    | email
------|--------------------------------------|-------------------------|----------------------
FIRM  | 00000000-0000-0000-0000-000000000001 | CaseBridge              | admin@casebridge.com
ADMIN | <your-user-id>                       | System Administrator    | admin@casebridge.com
```

---

## 🎯 FIRST LOGIN

### **Access the Platform**

1. Open browser: **http://localhost:5173**
2. You'll see the login page
3. Enter:
   - **Email**: `admin@casebridge.com`
   - **Password**: The password you set in Step 3a
4. Click **"Sign In"**
5. You should be redirected to the **Dashboard** ✅

### **What You'll See**

As the System Administrator, you have access to:
- ✅ **Dashboard** - Firm overview and statistics
- ✅ **Cases** - All client matters
- ✅ **Team** - Invite and manage users
- ✅ **Settings** - Update firm profile
- ✅ **Audit Logs** - View all system activity

---

## 👥 ADDING TEAM MEMBERS

### **Invite a Case Manager**

1. Go to **Team** page
2. Click **"Invite User"**
3. Enter:
   - **Email**: `casemanager@casebridge.com`
   - **Role**: Case Manager
4. Click **"Send Invite"**
5. Click **"Copy Link"** on the pending invitation
6. Share the link with the user

### **Invite an Associate Lawyer**

1. Go to **Team** page
2. Click **"Invite User"**
3. Enter:
   - **Email**: `lawyer@casebridge.com`
   - **Role**: Associate Lawyer
4. Click **"Send Invite"**
5. Click **"Copy Link"**
6. Share the link with the user

### **User Accepts Invitation**

1. User clicks the invitation link
2. Fills in their name and password
3. Clicks **"Complete Setup"**
4. Redirected to login page
5. Can now login with their email and password

---

## 🔐 USER ROLES & PERMISSIONS

### **Admin Manager** (System Administrator)
- ✅ Full access to everything
- ✅ Manage firm settings
- ✅ Invite/suspend/deactivate users
- ✅ View audit logs
- ✅ Assign cases
- ✅ Update case status

### **Case Manager**
- ✅ View dashboard
- ✅ View all cases
- ✅ Assign cases to associates
- ✅ Update case status
- ❌ Cannot manage team
- ❌ Cannot change firm settings
- ❌ Cannot view audit logs

### **Associate Lawyer**
- ✅ View dashboard
- ✅ View assigned cases only
- ❌ Cannot assign cases
- ❌ Cannot manage team
- ❌ Cannot change firm settings

---

## 📊 TYPICAL WORKFLOWS

### **Workflow 1: Onboard New Case Manager**

```
1. Admin logs in
2. Goes to Team → Invite User
3. Enters email, selects "Case Manager"
4. Copies invitation link
5. Sends link to new user
6. User accepts invitation
7. User can now login and manage cases
```

### **Workflow 2: Manage a Client Case**

```
1. Case Manager logs in
2. Goes to Cases → Views matter intake
3. Clicks "View Details" on a case
4. Reviews client information
5. Updates status to "Under Review"
6. Clicks "Assign Case"
7. Selects an associate lawyer
8. Case is now assigned and tracked
```

### **Workflow 3: Monitor System Activity**

```
1. Admin logs in
2. Goes to Audit Logs
3. Filters by action type
4. Searches for specific events
5. Reviews who did what and when
```

---

## 🎊 YOU'RE ALL SET!

The CaseBridge Internal Platform is now ready to use!

**Key Points to Remember:**
- ✅ Only ONE firm: CaseBridge
- ✅ Only ONE admin: Created via SQL
- ✅ All other users: Invited by admin
- ✅ All users belong to CaseBridge firm automatically
- ✅ Complete audit trail for all actions

---

## 📚 DOCUMENTATION

For more details, see:
- `FINAL_DELIVERY.md` - Complete feature overview
- `PHASE_4_COMPLETE.md` - Latest features
- `setup_admin.sql` - Detailed setup script

---

**Happy case managing!** 🚀
