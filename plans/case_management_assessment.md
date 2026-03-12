# CaseBridge: Case Management User Journey Assessment

## Executive Overview

This document analyzes the case management user journey across the CaseBridge platform, examining both the **Client Portal** and **Internal Portal** (Admin Manager, Case Manager, Associate Lawyer). The assessment identifies what is working correctly, what is in progress, and recommendations for improvements.

---

## 1. WHAT IS DONE CORRECTLY ✅

### 1.1 Client Portal Features

| Feature                     | Status      | Details                                                               |
| --------------------------- | ----------- | --------------------------------------------------------------------- |
| **Case Submission**         | ✅ Complete | Multi-step intake form with document upload capabilities              |
| **Case Status Tracking**    | ✅ Complete | ClientStageTracker component shows visual pipeline progress           |
| **Document Access**         | ✅ Complete | Clients can view documents marked as `is_client_visible`              |
| **Real-time Notifications** | ✅ Complete | Real-time alerts for case updates, status changes, report submissions |
| **Secure Messaging**        | ✅ Complete | AES-256 encrypted chat between clients and legal team                 |
| **Dashboard Overview**      | ✅ Complete | Shows active cases, pending signatures, recent activity               |
| **Progress Reports**        | ✅ Complete | Clients can view case reports submitted by staff                      |
| **E-Signatures**            | ✅ Complete | SignRequestModal for document signing workflow                        |

### 1.2 Staff Portal - Admin Manager

| Feature                 | Status      | Details                                             |
| ----------------------- | ----------- | --------------------------------------------------- |
| **Full Matter Access**  | ✅ Complete | RLS policy grants access to all matters in the firm |
| **Staff Management**    | ✅ Complete | Invite, assign roles, manage user_firm_roles        |
| **Firm Settings**       | ✅ Complete | Firm profile, billing, subscription management      |
| **Document Vault**      | ✅ Complete | Cross-matter document visibility with RBAC          |
| **Audit Logging**       | ✅ Complete | log_audit_event for tracking all critical actions   |
| **Notification System** | ✅ Complete | Real-time notifications for all case events         |

### 1.3 Staff Portal - Case Manager

| Feature                         | Status      | Details                                             |
| ------------------------------- | ----------- | --------------------------------------------------- |
| **Matter Lifecycle Management** | ✅ Complete | Full CRUD for legal matters                         |
| **Stage Pipeline**              | ✅ Complete | MatterStageTracker with gate-based progression      |
| **Task Management**             | ✅ Complete | MatterTasks with priorities, assignments, due dates |
| **Progress Reports**            | ✅ Complete | Submit case reports with document attachments       |
| **Client Communication**        | ✅ Complete | MatterChat for real-time messaging                  |
| **Internal Comments**           | ✅ Complete | CaseComments for internal staff collaboration       |
| **Deadline Management**         | ✅ Complete | Upcoming deadlines tracking                         |

### 1.4 Staff Portal - Associate Lawyer

| Feature                 | Status      | Details                                    |
| ----------------------- | ----------- | ------------------------------------------ |
| **Assigned Cases Only** | ✅ Complete | RLS restricts to matters assigned to them  |
| **Task Board**          | ✅ Complete | View and manage assigned tasks             |
| **Progress Updates**    | ✅ Complete | Can submit progress reports                |
| **Document Access**     | ✅ Complete | Access documents for assigned matters only |
| **Case Workspace**      | ✅ Complete | Full matter dossier access                 |

### 1.5 Infrastructure & Security

| Feature                       | Status      | Details                                             |
| ----------------------------- | ----------- | --------------------------------------------------- |
| **Row-Level Security**        | ✅ Complete | All tables protected with RLS policies              |
| **Role-Based Access Control** | ✅ Complete | Firm-scoped role management                         |
| **Multi-Firm Isolation**      | ✅ Complete | session_context ensures firm-to-firm data isolation |
| **Real-Time Subscriptions**   | ✅ Complete | Supabase realtime for live updates                  |
| **Email Integration**         | ✅ Complete | Resend configured for transactional emails          |

---

## 2. WHAT IS IN PROGRESS 🚧

### 2.1 Calendar Integration

| Feature                   | Status         | Details                                     |
| ------------------------- | -------------- | ------------------------------------------- |
| **Google Calendar Sync**  | 🚧 In Progress | Edge functions for OAuth and token refresh  |
| **Outlook Calendar Sync** | 🚧 In Progress | outlookCalendar.js service exists           |
| **Calendar Selector UI**  | 🚧 Complete    | CalendarSelector.tsx component built        |
| **Bi-directional Sync**   | 🚧 Pending     | Case meetings need external calendar sync   |
| **Cron Job Setup**        | 🚧 In Progress | CALENDAR_CRON_SETUP.md documentation exists |

**Current State:** The calendar infrastructure is partially built with OAuth flows, but actual bi-directional sync with external calendars is not yet operational.

### 2.2 Advanced Task Features

| Feature                 | Status         | Details                                        |
| ----------------------- | -------------- | ---------------------------------------------- |
| **Task Dependencies**   | 🚧 Not Started | No task dependency tracking implemented        |
| **Checklist Templates** | 🚧 Not Started | Pre-defined task lists not yet available       |
| **Task Notifications**  | 🚧 Partial     | Basic audit logging, but no push notifications |

### 2.3 Financial/Billing Features

| Feature               | Status         | Details                               |
| --------------------- | -------------- | ------------------------------------- |
| **Time Tracking**     | 🚧 Not Started | No time_entries table implementation  |
| **Expense Tracking**  | 🚧 Not Started | No expense logging for matters        |
| **Dynamic Invoicing** | 🚧 Not Started | Invoice generation from time/expenses |
| **Trust Accounting**  | 🚧 Not Started | Retainer and escrow tracking          |

---

## 3. WHAT NEEDS TO BE DONE 📋

### 3.1 Priority 1: Essential Features

#### A. Complete Calendar Integration

- [ ] Finalize bi-directional sync with Google Calendar
- [ ] Finalize bi-directional sync with Outlook
- [ ] Implement calendar event creation from case meetings
- [ ] Add calendar sync status indicators

#### B. Task Management Enhancement

- [ ] Implement task dependencies (Task A blocks Task B)
- [ ] Create checklist templates for common case types
- [ ] Add push/email notifications for upcoming and overdue tasks
- [ ] Add task assignment bulk actions

#### C. Time & Billing

- [ ] Create `time_entries` table for logging billable hours
- [ ] Create `expenses` table for matter-related costs
- [ ] Build time entry UI for staff to log hours
- [ ] Implement expense tracking with receipts
- [ ] Create invoice generation from time/expenses

### 3.2 Priority 2: Enhanced Client Experience

#### A. Interactive Case Timeline

- [ ] Build visual "Case Journey" map for clients
- [ ] Show completed, current, and upcoming stages
- [ ] Add milestone celebrations for case progress

#### B. Client Self-Service

- [ ] Add questionnaire/form builder for evidence gathering
- [ ] Enable clients to upload additional documents anytime
- [ ] Add case feedback/rating system

#### C. Enhanced Communication

- [ ] Add email notification preferences (toggle email/SMS/in-app)
- [ ] Implement two-factor authentication for clients
- [ ] Add read receipts for messages

### 3.3 Priority 3: Operational Excellence

#### A. Advanced Document Management

- [ ] Implement document versioning (v1, v2, final)
- [ ] Add document template generation
- [ ] Implement conflict check engine
- [ ] Add retention policies (auto-archive after statutory period)

#### B. Analytics & Reporting

- [ ] Add case velocity tracking
- [ ] Staff workload analytics
- [ ] SLA compliance dashboards
- [ ] Custom report builder

#### C. AI Features (Future)

- [ ] Case summarization from document threads
- [ ] Automated evidence indexing
- [ ] Risk assessment for stagnant cases

---

## 4. USER JOURNEY MATRIX

### Client Journey Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Submit   │───▶│   View      │───▶│   Receive   │───▶│  Complete   │
│   Case     │    │   Status    │    │   Updates   │    │  Matter     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
  ✅ Complete         ✅ Complete         ✅ Complete         ✅ Complete

  🚧 Needs:          🚧 Needs:           🚧 Needs:           🚧 Needs:
  - Timeline View    - Interactive      - Email Prefs       - Rating/FB
  - Self-Upload      - Journey Map      - 2FA
```

### Admin Manager Journey Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Manage   │───▶│   Assign    │───▶│   Monitor   │───▶│   Review    │
│   Staff    │    │   Cases     │    │   Progress │    │   Reports   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
  ✅ Complete         ✅ Complete         ✅ Complete         ✅ Complete

  🚧 Needs:          🚧 Needs:           🚧 Needs:           🚧 Needs:
  - Security 2FA    - Task Templates    - Analytics        - Custom Reports
  - IP Whitelisting - Conflict Check    - Workload Dashboards
```

### Case Manager Journey Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Review    │───▶│   Assign    │───▶│   Track     │───▶│   Report    │
│   Intake    │    │   Tasks     │    │   Stages    │    │   Progress  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                   │                   │
      ▼                   ▼                   ▼                   ▼
  ✅ Complete         ✅ Complete         ✅ Complete         ✅ Complete

  🚧 Needs:          🚧 Needs:           🚧 Needs:           🚧 Needs:
  - Task Templates  - Task Depend.      - Calendar Sync     - Analytics
  - Auto-Stage      - Reminders         - Deadline Views   - Export
```

### Associate Lawyer Journey Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   View     │───▶│   Complete  │───▶│   Submit    │───▶│   Message   │
│   Assigned │    │   Tasks     │    │   Updates   │    │   Client    │
│   Matters  │    └─────────────┘    └─────────────┘    └─────────────┘
└─────────────┘
      │
      ▼
  ✅ Complete

  🚧 Needs:
  - Task Notifications
  - Calendar Integration
```

---

## 5. RECOMMENDED NEXT STEPS

Based on the analysis, here is the recommended implementation order:

### Phase 1: Complete Calendar Integration (Current)

1. Finalize Google Calendar OAuth flow
2. Implement bi-directional sync
3. Add sync status indicators

### Phase 2: Financial Foundation

1. Implement time tracking
2. Add expense logging
3. Build invoice generation

### Phase 3: Client Experience Enhancement

1. Interactive case timeline
2. Email notification preferences
3. Two-factor authentication

### Phase 4: Operational Intelligence

1. Task dependencies
2. Analytics dashboards
3. Conflict check engine

---

## 6. GAP SUMMARY TABLE

| Category   | Feature              | Status         | Priority |
| ---------- | -------------------- | -------------- | -------- |
| **Client** | Case Timeline View   | ❌ Missing     | P2       |
| **Client** | Email Preferences    | ❌ Missing     | P2       |
| **Client** | 2FA                  | ❌ Missing     | P2       |
| **Client** | Self Document Upload | ❌ Missing     | P2       |
| **Client** | Case Feedback        | ❌ Missing     | P2       |
| **Staff**  | Calendar Sync        | 🚧 In Progress | P1       |
| **Staff**  | Time Tracking        | ❌ Missing     | P1       |
| **Staff**  | Expense Tracking     | ❌ Missing     | P1       |
| **Staff**  | Invoice Generation   | ❌ Missing     | P1       |
| **Staff**  | Task Dependencies    | ❌ Missing     | P1       |
| **Staff**  | Task Templates       | ❌ Missing     | P2       |
| **Staff**  | Push Notifications   | ❌ Missing     | P2       |
| **Staff**  | Security 2FA         | ❌ Missing     | P3       |
| **Staff**  | Conflict Check       | ❌ Missing     | P3       |
| **Staff**  | Analytics Dashboards | ❌ Missing     | P3       |
| **Admin**  | IP Whitelisting      | ❌ Missing     | P3       |
| **Admin**  | Retention Policies   | ❌ Missing     | P3       |
| **Admin**  | Document Versioning  | ❌ Missing     | P3       |

---

_Assessment generated: 2026-03-12_
_Prepared by: CaseBridge Architecture Team_
