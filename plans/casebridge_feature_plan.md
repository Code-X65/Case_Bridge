# CaseBridge Feature Implementation Plan

## Executive Summary

After analyzing the CaseBridge codebase, I've identified the remaining features that need implementation. The project is quite mature with most core functionality already in place. Below is a prioritized implementation plan.

---

## Priority Features

### 1. Two-Factor Authentication (2FA) - HIGH PRIORITY

**Current State:**

- UI toggle exists in [`FirmSettingsPage.tsx`](CaseBridge_Internal/src/pages/internal/FirmSettingsPage.tsx:303) and [`FirmProfilePage.tsx`](CaseBridge_Internal/src/pages/internal/FirmProfilePage.tsx:274)
- `enforce_2fa` column exists in `firms` table
- No actual 2FA implementation exists

**Implementation Requirements:**

#### Database Schema

```sql
-- User 2FA configuration
CREATE TABLE public.user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  secret_key TEXT NOT NULL, -- Encrypted TOTP secret
  backup_codes TEXT[] DEFAULT '{}', -- Encrypted backup codes
  enabled_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_2fa ENABLE ROW LEVEL SECURITY;
```

#### Dependencies Needed

- `otplib` - TOTP generation and validation
- `qrcode` - Generate QR codes for authenticator app setup

#### Components to Implement

1. **2FA Setup Page** (`/settings/2fa-setup`)
   - Generate TOTP secret
   - Display QR code for authenticator apps (Google Authenticator, Authy)
   - Verification input
   - Backup codes generation and display

2. **2FA Login Flow** (`/auth/login`)
   - After password validation, check if user has 2FA enabled
   - Redirect to 2FA verification page
   - Support backup codes as fallback

3. **Profile Settings Update**
   - Add "Enable 2FA" button in [`ProfileSettings.tsx`](CaseBridge_Internal/src/pages/internal/ProfileSettings.tsx)

4. **Backend Middleware**
   - Create 2FA verification endpoint
   - Add middleware to enforce 2FA when firm has `enforce_2fa = true`

---

### 2. Calendar Integration Enhancement - MEDIUM PRIORITY

**Current State:**

- Internal calendar exists with meetings and deadlines
- iCal export token in [`InternalCalendar.tsx`](CaseBridge_Internal/src/pages/internal/InternalCalendar.tsx:572)
- Google/Azure OAuth UI in [`ProfileSettings.tsx`](CaseBridge_Internal/src/pages/internal/ProfileSettings.tsx:67)
- Calendar sync infrastructure in [`CALENDAR_SYNC_INIT.sql`](CaseBridge_Internal/supabase/CALENDAR_SYNC_INIT.sql)

**Implementation Requirements:**

#### Backend Endpoints Needed

1. **OAuth Handlers**
   - `GET /auth/google/calendar` - Initiate Google OAuth
   - `GET /auth/google/callback` - Handle OAuth callback
   - `GET /auth/outlook/calendar` - Initiate Microsoft OAuth
   - `GET /auth/outlook/callback` - Handle OAuth callback

2. **Calendar Sync Edge Function**
   - Periodic sync (cron job) to push meetings/deadlines to external calendars
   - Webhook handlers for incoming calendar changes

#### Frontend Components

1. **Enhanced Calendar Connection UI** in ProfileSettings
2. **Sync Status Dashboard** showing last sync time

---

### 3. Task Management Enhancements - MEDIUM PRIORITY

**Current State:**

- [`MatterTasks.tsx`](CaseBridge_Internal/src/components/matters/MatterTasks.tsx) component exists
- Database schema includes: `matter_tasks`, `task_templates`, `task_comments`
- Features: dependencies, recurrence rules, checklists, client visibility

**Implementation Requirements:**

#### What's Already Implemented ✅

- Task CRUD with matter association
- Stage-based task organization
- Priority levels
- Due dates
- Assignee management
- Checklist items
- Task dependencies (with circular dependency validation)
- Recurrence rules (RRULE format)
- Task templates
- Client visibility toggle
- Notifications for task changes

#### What's Missing ❌

- **Task Templates UI** - Allow creating reusable templates
- **Recurring Task Processing** - Edge function to generate instances from RRULE
- **My Tasks View** - [`MyTasksPage.tsx`](CaseBridge_Internal/src/pages/internal/MyTasksPage.tsx) needs improvement to show tasks across all matters

---

### 4. Rich-Text Editor for Notes - LOW PRIORITY

**Current State:**

- `react-quill-new` is already installed in dependencies

**Implementation Requirements:**

1. Replace plain text inputs with Rich Text Editor in:
   - [`MatterNotesHub.tsx`](CaseBridge_Internal/src/components/matters/MatterNotesHub.tsx)
   - Internal matter notes

---

## Feature Comparison Matrix

| Feature                      | Status      | Location                                      |
| ---------------------------- | ----------- | --------------------------------------------- |
| Multi-firm registration      | ✅ Done     | `RegisterFirmPage.tsx`                        |
| Staff invitation system      | ✅ Done     | `InviteUserModal.tsx`, `AcceptInvitePage.tsx` |
| Matter lifecycle management  | ✅ Done     | `MatterWorkspace.tsx`                         |
| Document vault               | ✅ Done     | `DocumentVault.tsx`                           |
| SLA & reporting              | ✅ Done     | `ReportingDashboard.tsx`                      |
| Notifications                | ✅ Done     | `NotificationBell.tsx`                        |
| Audit logging                | ✅ Done     | `AuditLogsPage.tsx`                           |
| Email integration            | ✅ Done     | Edge Functions with Resend                    |
| Client vault                 | ✅ Done     | `ClientDashboard.tsx`                         |
| Firm billing/subscription    | ✅ Done     | `FirmBillingPage.tsx`                         |
| Client messaging             | ✅ Done     | `MatterChat.tsx`                              |
| Payment (Paystack)           | ✅ Done     | Client portal                                 |
| Case reporting workflow      | ✅ Done     | `IntakeReview.tsx`                            |
| 2FA toggle UI                | ⚠️ Partial  | `FirmSettingsPage.tsx`                        |
| Calendar sync infrastructure | ⚠️ Partial  | `InternalCalendar.tsx`                        |
| Task management              | ⚠️ Partial  | `MatterTasks.tsx`                             |
| Two-Factor Authentication    | ❌ Not Done | -                                             |
| External calendar sync       | ❌ Not Done | -                                             |
| Task templates UI            | ❌ Not Done | -                                             |

---

## Recommended Implementation Order

1. **Two-Factor Authentication (2FA)** - Highest security priority
2. **Calendar Integration Enhancement** - Improves user productivity
3. **Task Management Enhancements** - Better workflow organization
4. **Rich-Text Editor** - Nice-to-have improvement

---

## Technical Dependencies

### NPM Packages Needed

```json
{
  "dependencies": {
    "otplib": "^7.x",
    "qrcode": "^1.5.x"
  }
}
```

### Environment Variables Needed

```
# For Calendar Integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
```

---

## Next Steps

Would you like me to proceed with creating detailed implementation specifications for any of these features? I recommend starting with **Two-Factor Authentication** as it has the highest security impact.
