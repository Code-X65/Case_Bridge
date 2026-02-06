# CaseBridge Comprehensive Enhancements - Implementation Guide

## 📋 Overview
This document outlines all enhancements made to the CaseBridge platform to support:
1. Document management across all user types
2. Real-time notifications system
3. Role-based access control
4. Internal collaboration tools

---

## 🗄️ Database Changes (COMPREHENSIVE_ENHANCEMENTS.sql)

### New Tables Created

#### 1. `notifications`
Stores all system notifications for users.

**Columns:**
- `id` - UUID primary key
- `user_id` - References auth.users
- `type` - Notification type (case_submitted, status_change, assignment, etc.)
- `title` - Notification headline
- `message` - Detailed message
- `related_case_id` - Optional link to matter
- `related_report_id` - Optional link to case_report
- `is_read` - Boolean flag
- `metadata` - JSONB for additional data
- `created_at` - Timestamp

**Notification Types:**
- `case_submitted` - New case submitted by client
- `status_change` - Case status updated
- `assignment` - Staff assigned to case
- `lawyer_assigned` - Lawyer assigned (client notification)
- `report_update` - Progress report submitted

#### 2. `case_comments`
Internal collaboration system for Admin/Case Managers.

**Columns:**
- `id` - UUID primary key
- `matter_id` - References matters
- `author_id` - References profiles
- `comment_text` - Comment content
- `is_internal` - Always TRUE (for future client-visible comments)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Enhanced Tables

#### `case_report_documents`
**New Columns Added:**
- `firm_id` - References firms (optional)
- `is_client_visible` - Boolean (default TRUE)
- `uploaded_by_user_id` - References auth.users

---

## 🔐 Security & Access Control

### New Security Functions

#### `is_assigned_to_matter(matter_id UUID)`
Returns TRUE if the current user is assigned as associate or case manager to the specified matter.

#### `is_admin_or_case_manager()`
Returns TRUE if the current user has admin_manager or case_manager role.

#### `is_associate_lawyer()`
Returns TRUE if the current user has associate_lawyer role.

### RLS Policies Summary

#### Document Access
1. **Clients:**
   - Can upload documents to their own cases
   - Can view all documents for their cases (where `is_client_visible = TRUE`)

2. **Admin/Case Managers:**
   - Full access to ALL documents across all cases
   - Can upload, view, and manage any document

3. **Associate Lawyers:**
   - Can view documents ONLY for cases assigned to them
   - Cannot view documents for unassigned cases

#### Matter Access
1. **Admin/Case Managers:**
   - Full access to ALL matters

2. **Associate Lawyers:**
   - Can ONLY view matters assigned to them
   - Cannot see unassigned or other associates' matters

#### Notifications
- Users can only see their own notifications
- Automatic creation via triggers

#### Case Comments
- Admin/Case Managers can create and view all comments
- Associates can view comments on their assigned cases only
- Clients cannot see comments (internal only)

---

## 🔔 Automated Notification Triggers

### 1. New Case Submission
**Trigger:** `trg_notify_new_case`
**Fires:** After INSERT on `case_reports`
**Recipients:** All active staff members
**Type:** `case_submitted`

### 2. Case Status Change
**Trigger:** `trg_notify_status_change`
**Fires:** After UPDATE on `case_reports` (when status changes)
**Recipients:** 
- Client who submitted the case
- All active staff members
**Type:** `status_change`

### 3. Matter Assignment
**Trigger:** `trg_notify_assignment`
**Fires:** After INSERT/UPDATE on `matters` (when assignments change)
**Recipients:**
- Assigned associate lawyer
- Assigned case manager
- Client (when lawyer is assigned)
**Type:** `assignment` (staff) or `lawyer_assigned` (client)

### 4. Progress Report Submission
**Trigger:** `trg_notify_report_update`
**Fires:** After INSERT on `matter_updates`
**Recipients:**
- Client (if `client_visible = TRUE`)
- Assigned associate
- Assigned case manager
**Type:** `report_update`

---

## 🎨 Frontend Components Created

### 1. NotificationBell.tsx (Internal)
**Location:** `src/components/notifications/NotificationBell.tsx`

**Features:**
- Real-time notification updates via Supabase realtime
- Unread count badge
- Dropdown panel with latest 20 notifications
- Mark as read functionality
- Mark all as read
- Icon-based notification types

**Usage:**
```tsx
import NotificationBell from '@/components/notifications/NotificationBell';

// In your header/navbar:
<NotificationBell />
```

### 2. ClientNotificationBell.tsx (Client Portal)
**Location:** `src/components/ClientNotificationBell.tsx`

**Features:**
- Same as internal bell but styled for light theme
- Shows client-specific notifications
- Real-time updates

**Usage:**
```tsx
import ClientNotificationBell from '@/components/ClientNotificationBell';

// In client navbar:
<ClientNotificationBell />
```

### 3. CaseComments.tsx (Internal)
**Location:** `src/components/case/CaseComments.tsx`

**Features:**
- Real-time comment updates
- Post new comments
- Delete own comments
- Author attribution
- Only visible to Admin/Case Managers

**Usage:**
```tsx
import CaseComments from '@/components/case/CaseComments';

// In MatterWorkspace or case detail page:
<CaseComments matterId={matter.id} />
```

---

## 📝 Integration Steps

### Step 1: Run Database Script
```sql
-- Run this in Supabase SQL Editor:
-- File: COMPREHENSIVE_ENHANCEMENTS.sql
```

### Step 2: Add Notification Bell to Internal Sidebar
The InternalSidebar already has notification support via `useNotifications` hook.

### Step 3: Add Notification Bell to Client Navbar
```tsx
// In Casebridge-client/src/components/Navbar.tsx or similar:
import ClientNotificationBell from '@/components/ClientNotificationBell';

// Add to navbar:
<ClientNotificationBell />
```

### Step 4: Add Case Comments to Matter Workspace
```tsx
// In MatterWorkspace.tsx, add after the case details section:
import CaseComments from '@/components/case/CaseComments';

// In the sidebar or main content area:
<CaseComments matterId={matter.id} />
```

### Step 5: Update Document Upload Logic
The database now supports the required columns. Ensure your upload code includes:
```tsx
await supabase.from('case_report_documents').insert({
    case_report_id: caseId,
    firm_id: firmId, // Optional
    file_name: file.name,
    file_path: filePath,
    file_type: file.type,
    file_size: file.size,
    is_client_visible: true, // or false for internal docs
    uploaded_by_user_id: userId
});
```

---

## ✅ Feature Checklist

### Document Management
- [x] Internals can submit documents with case updates
- [x] Clients can access all documents for their cases
- [x] Documents uploaded by internal staff visible to clients (when marked)
- [x] Admin/Case Managers have access to all documents
- [x] Associates have access to documents for assigned cases only

### Notifications - Internal
- [x] New case submitted
- [x] Case status change
- [x] Case report update submitted
- [x] Lawyers assigned to case
- [x] Real-time notification delivery

### Notifications - Client
- [x] Case submission success
- [x] Case status change
- [x] Case report update submitted
- [x] Lawyer assigned to case
- [x] Real-time notification delivery

### Access Control
- [x] Admin/Case Managers access all cases and documents
- [x] Associates access only assigned cases and documents
- [x] Clients access only their own cases and documents

### Collaboration
- [x] Admin/Case Managers can comment on cases
- [x] Comments are internal-only
- [x] Real-time comment updates

---

## 🔧 Additional Enhancements to Consider

### Future Notifications
1. **Meeting Scheduled** - When a meeting is booked
2. **Meeting Reminder** - 24 hours before meeting
3. **Document Uploaded** - When new evidence is added
4. **Case Closed** - Final notification
5. **Payment Received** - Invoice paid confirmation
6. **Deadline Approaching** - Case milestone reminders

### Future Features
1. **Email Notifications** - Send email for critical notifications
2. **Push Notifications** - Browser push for real-time alerts
3. **Notification Preferences** - Let users customize which notifications they receive
4. **Comment Mentions** - @mention other staff members in comments
5. **Comment Threads** - Reply to specific comments
6. **Document Versioning** - Track document revisions
7. **Bulk Actions** - Mark multiple notifications as read

---

## 🐛 Troubleshooting

### Notifications Not Appearing
1. Check that triggers are enabled: `SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_notify%';`
2. Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'notifications';`
3. Check Supabase realtime is enabled for the `notifications` table

### Document Upload Failing
1. Verify `case_report_documents` has all required columns
2. Check RLS policies allow the current user to insert
3. Verify storage bucket permissions

### Comments Not Showing
1. Verify user has admin_manager or case_manager role
2. Check RLS policies on `case_comments` table
3. Verify matter_id is correct

---

## 📊 Database Monitoring

### Check Notification Stats
```sql
SELECT 
    type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE is_read = false) as unread
FROM public.notifications
GROUP BY type;
```

### Check Comment Activity
```sql
SELECT 
    m.title as case_title,
    COUNT(cc.id) as comment_count
FROM public.matters m
LEFT JOIN public.case_comments cc ON cc.matter_id = m.id
GROUP BY m.id, m.title
ORDER BY comment_count DESC;
```

### Check Document Access
```sql
SELECT 
    cr.title as case_title,
    COUNT(crd.id) as document_count,
    COUNT(*) FILTER (WHERE crd.is_client_visible = true) as client_visible_count
FROM public.case_reports cr
LEFT JOIN public.case_report_documents crd ON crd.case_report_id = cr.id
GROUP BY cr.id, cr.title;
```

---

## 🎯 Success Criteria

All features are working correctly when:

1. ✅ Client submits case → All staff receive notification
2. ✅ Admin changes case status → Client and staff receive notification
3. ✅ Admin assigns lawyer → Lawyer and client receive notification
4. ✅ Staff submits progress report → Client receives notification (if visible)
5. ✅ Client uploads document → Document appears in staff workspace
6. ✅ Staff uploads document → Document appears in client portal (if marked visible)
7. ✅ Admin/CM posts comment → Other admins/CMs see it in real-time
8. ✅ Associate can only see assigned cases
9. ✅ Admin can see all cases
10. ✅ All notifications appear in real-time without page refresh

---

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify database triggers are firing
3. Check RLS policies are correctly applied
4. Review Supabase logs for errors
5. Ensure realtime is enabled for relevant tables
