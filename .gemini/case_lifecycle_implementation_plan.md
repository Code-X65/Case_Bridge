# Case Management Lifecycle Implementation Plan

## Overview
This document outlines the implementation of a full case management lifecycle with strict status transitions, progress tracking, and client notifications.

---

## Phase 1: Database Migration ✅ COMPLETED

**File Created**: `c:\dev\Casebridge\CaseBridge_Internal\supabase\migrations\case_lifecycle_simplified.sql`

### What Was Created:

1. **court_reports table**
   - Stores court reports submitted by Associate Lawyers
   - Links to matters and associate_id
   - Includes report_content and close_case flag

2. **court_report_attachments table**
   - Stores file attachments for court reports
   - Links to court_reports
   - Includes file metadata

3. **matters table updates**
   - Added `reviewed_by` (UUID)
   - Added `reviewed_at` (TIMESTAMP)
   - Added `reviewed_by_role` (TEXT)

4. **Status constraint updated**
   - Added new statuses: Reviewed, Active, Ongoing
   - Kept legacy statuses for backward compatibility

5. **transition_case_status() function**
   - Enforces status transition rules
   - Logs all transitions
   - Creates client notifications automatically

6. **submit_court_report() function**
   - Handles court report submission
   - Auto-transitions status on first report
   - Closes case if requested
   - Notifies client

---

## Phase 2: Frontend Implementation (TO DO)

### 2.1 Update Matter Intake Page

**File**: `c:\dev\Casebridge\CaseBridge_Internal\src\pages\cases\MatterIntakePage.tsx`

**Changes Needed**:
- For "Pending Review" cases, show "Review Case" button instead of "View Details"
- On click, transition status to "Reviewed" and navigate to detail page

### 2.2 Create Court Report Component

**New File**: `c:\dev\Casebridge\CaseBridge_Internal\src\components\cases\CourtReportSubmission.tsx`

**Features**:
- Large textarea for report content
- Multiple file upload for attachments
- "Close Case" checkbox
- "Submit Court Report" button
- Only visible to assigned Associate Lawyer

### 2.3 Update Matter Detail Page

**File**: `c:\dev\Casebridge\CaseBridge_Internal\src\pages\cases\MatterDetailPage.tsx`

**Changes Needed**:
- Add Court Report submission section (for Associate Lawyers)
- Display list of submitted court reports
- Show case status timeline
- Display who reviewed the case

### 2.4 Create Client Notifications Component

**New File**: `c:\dev\Casebridge\Casebridge_Client\src\components\notifications\NotificationsList.tsx`

**Features**:
- Display case-specific notifications
- Show status changes
- Show new court reports
- Mark as read functionality

### 2.5 Update Client Dashboard

**File**: `c:\dev\Casebridge\Casebridge_Client\src\pages\client\DashboardPage.tsx`

**Changes Needed**:
- Add notifications section
- Show recent case updates

### 2.6 Create Client Case Detail Updates

**File**: `c:\dev\Casebridge\Casebridge_Client\src\pages\client\matters\MatterDetailPage.tsx`

**Changes Needed**:
- Display court reports (read-only)
- Show status timeline
- Display assigned lawyer info

---

## Status Flow Implementation

### Canonical Flow:
```
Pending Review → Reviewed → Assigned → Active/Ongoing → Closed/Completed
```

### Triggers:

1. **Pending Review → Reviewed**
   - **Who**: Admin Manager OR Case Manager
   - **Action**: Opens/reviews case
   - **System**: Records reviewed_by, reviewed_at, reviewed_by_role

2. **Reviewed → Assigned**
   - **Who**: Admin Manager OR Case Manager
   - **Action**: Assigns Associate Lawyer
   - **System**: Creates case_assignment record

3. **Assigned → Active/Ongoing**
   - **Who**: Assigned Associate Lawyer
   - **Action**: Submits first court report
   - **System**: Auto-transitions status

4. **Active/Ongoing → Closed/Completed**
   - **Who**: Assigned Associate Lawyer
   - **Action**: Submits report with "Close Case" checked
   - **System**: Auto-transitions status, locks case

---

## Client Notification Types

1. **Case Status Changed**
   - Triggered on every status transition
   - Shows old status → new status
   - Custom message per status

2. **Court Report Submitted**
   - Triggered when Associate Lawyer submits report
   - Links to case detail page
   - Shows report submission date

3. **Lawyer Assigned**
   - Triggered when case moves to "Assigned"
   - Shows lawyer name
   - Provides contact info

4. **Case Closed**
   - Triggered when case reaches Closed/Completed
   - Final notification
   - Provides case summary

---

## Role-Based Access Control

### Admin Manager:
- ✅ Can review cases (Pending → Reviewed)
- ✅ Can assign lawyers (Reviewed → Assigned)
- ✅ Can view all court reports
- ✅ Can see full case history
- ❌ Cannot submit court reports
- ❌ Cannot close cases

### Case Manager:
- ✅ Can review cases (Pending → Reviewed)
- ✅ Can assign lawyers (Reviewed → Assigned)
- ✅ Can view all court reports
- ✅ Can see full case history
- ❌ Cannot submit court reports
- ❌ Cannot close cases

### Associate Lawyer:
- ✅ Can submit court reports (if assigned)
- ✅ Can close cases (via report submission)
- ✅ Can view reports for assigned cases
- ❌ Cannot review cases
- ❌ Cannot assign lawyers
- ❌ Can only see assigned cases

### Client:
- ✅ Can view case status (read-only)
- ✅ Can view court reports (read-only)
- ✅ Can receive notifications
- ✅ Can see assigned lawyer info
- ❌ Cannot modify case
- ❌ Cannot change status
- ❌ Cannot submit reports

---

## Database Functions Usage

### For Frontend Developers:

#### 1. Review a Case
```typescript
const { data, error } = await supabase.rpc('transition_case_status', {
  p_matter_id: caseId,
  p_new_status: 'Reviewed',
  p_note: 'Case reviewed and approved'
});
```

#### 2. Assign Lawyer (then transition)
```typescript
// First create assignment
await supabase.from('case_assignments').insert({
  matter_id: caseId,
  associate_id: lawyerId,
  assigned_by: currentUserId
});

// Then transition status
await supabase.rpc('transition_case_status', {
  p_matter_id: caseId,
  p_new_status: 'Assigned'
});
```

#### 3. Submit Court Report
```typescript
const { data, error } = await supabase.rpc('submit_court_report', {
  p_matter_id: caseId,
  p_report_content: reportText,
  p_close_case: shouldClose
});
```

#### 4. Fetch Court Reports
```typescript
const { data: reports } = await supabase
  .from('court_reports')
  .select(`
    *,
    associate:profiles!court_reports_associate_id_fkey(first_name, last_name),
    attachments:court_report_attachments(*)
  `)
  .eq('matter_id', caseId)
  .order('created_at', { ascending: false });
```

#### 5. Fetch Client Notifications
```typescript
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', clientId)
  .order('created_at', { ascending: false });
```

---

## Next Steps

### Immediate (Priority 1):
1. ✅ Run the database migration
2. ⏳ Update Matter Intake Page with "Review Case" button
3. ⏳ Create Court Report Submission component
4. ⏳ Update Matter Detail Page to show reports

### Short-term (Priority 2):
1. ⏳ Create Client Notifications component
2. ⏳ Update Client Dashboard with notifications
3. ⏳ Update Client Case Detail to show reports

### Testing:
1. ⏳ Test status transitions with all roles
2. ⏳ Test court report submission
3. ⏳ Test client notifications
4. ⏳ Test access control for each role

---

## Migration Instructions

### To Apply This Migration:

1. **Via Supabase CLI**:
```bash
cd CaseBridge_Internal
supabase db push
```

2. **Via Supabase Dashboard**:
- Go to SQL Editor
- Copy contents of `case_lifecycle_simplified.sql`
- Execute the migration

3. **Verify Migration**:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('court_reports', 'court_report_attachments');

-- Check if functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('transition_case_status', 'submit_court_report');
```

---

## Safety Checks

✅ **No Breaking Changes**:
- Existing tables not modified (only extended)
- Legacy statuses preserved
- Existing RLS policies maintained
- Client submission flow unchanged

✅ **Backward Compatibility**:
- Old status values still valid
- Existing case_logs structure unchanged
- Current notifications table extended

✅ **Security**:
- RLS policies enforce role-based access
- SECURITY DEFINER functions validate permissions
- All transitions logged and auditable

---

## Success Criteria

### Must Have:
- ✅ Database migration applied successfully
- ⏳ Status transitions work correctly
- ⏳ Court reports can be submitted
- ⏳ Client notifications are created
- ⏳ All roles have correct access

### Should Have:
- ⏳ UI shows "Review Case" for pending cases
- ⏳ Court report form is user-friendly
- ⏳ Notifications are displayed prominently
- ⏳ Status timeline is clear

### Nice to Have:
- ⏳ Email notifications for clients
- ⏳ Report templates
- ⏳ Bulk case review
- ⏳ Analytics dashboard

---

## Documentation Status

- ✅ Database schema documented
- ✅ Status flow documented
- ✅ API functions documented
- ⏳ Frontend components to be documented
- ⏳ User guide to be created

---

**Last Updated**: 2026-01-15  
**Status**: Phase 1 Complete, Phase 2 Pending
