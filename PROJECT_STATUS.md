# CaseBridge Project Status & Roadmap

This document outlines the current state and remaining tasks for the **CaseBridge** ecosystem, covering both the **Internal Operations** and **Client Portal** phases.

---

## 1. Internal Operations Phase (`CaseBridge_Internal`)

The internal platform is designed for legal professionals (Admin Managers, Case Managers, Associate Lawyers) to manage firms, staff, and legal matters.

### ✅ Completed Features
*   **Multi-Firm Registration**: Root admin creation of legal firms with unique IDs and scoping.
*   **Secure Staff Invitation System**: Token-based invitations with pre-assigned roles and automated audit logging.
*   **Matter Lifecycle Management**: Basic CRUD for legal matters, status tracking, and associate assignment.
*   **Centralized Document Vault**: Cross-matter document visibility with role-based access control (RBAC).
*   **SLA & Reporting Module**: Real-time metrics dashboard tracking response times, resolution days, and staff workloads.
*   **Internal Notifications System**: Real-time alerts for staff (e.g., new intake assigned).
*   **Audit Logging**: Detailed tracking of critical actions (logins, role changes, data access).
*   **Multi-Provider Email Functionality**: Supabase Edge Function configured for Resend and SendGrid with configurable production senders.
*   **Client Vault (Global Documents)**: Clients can manage personal documents independently of cases and use them for new intakes.
*   **Client Onboarding Refinement**: Premium multi-step onboarding with identity verification simulation and pathway optimization.
*   **Firm Billing & Subscription**: Fully functional "Billing & Subscription" module with Tier-based governance and automated trials.

### 🚧 Remaining Tasks (Next Steps)

3.  **System Settings & Security**:
    *   Implement "Security & Access" controls (IP whitelisting, 2FA enforcement).
    *   Implement firm-wide "Settings" (default matter templates, custom categories).
4.  **Task Management & Workflow**:
    *   Add "Tasks" sub-module for Associate Lawyers to manage their daily work within a matter.
5.  **Enhanced Calendar Integration**:
    *   Sync internal schedules with external calendars (Google/Outlook).
    *   Finalize Case Manager visibility over all Associate calendars.
6.  **Matter Workspace Depth**:
    *   Finalize "Intake Review" to "Matter" transition automation.
    *   Add rich-text editor for internal legal notes.

---

## 2. Client Portal Phase (`casebridge-client`)

The client portal allows public reporters and invited clients to submit cases, track progress, and communicate securely with counsel.

### ✅ Completed Features
*   **Protected Identity Model**: Secure signup/login with "External User" scoping.
*   **Priority Intake Payment (Paystack)**: Fully functional "Select Plan -> Pay -> Unlock Intake" flow.
*   **Case Reporting Workflow**: Multi-step form with document upload hooks.
*   **Real-time Secure Messaging**: AES-256 encrypted (simulated) chat between clients and their assigned legal team via Supabase Channels.
*   **Client Dashboard**: Progress visualization and recent activity tracking.
*   **Billing History**: Client-side invoice tracking and "Pay Now" for pending drafts.
*   **Global Document Management**: Clients can manage "Stored Documents" independently of cases and reuse them for new reports.
*   **Client Onboarding Refinement**: Polished the transitional "Landing Page" and onboarding steps for different intake categories.

### 🚧 Remaining Tasks (Next Steps)
1.  **Two-Factor Authentication (Phase 2)**:
    *   Placeholder in settings; needs implementation for high-security legal data access.
2.  **Notification Preferences**:
    *   Allow clients to toggle Email vs SMS vs In-app alerts for case updates.
5.  **Public Portal Expansion**:
    *   Enhance the "Public Intake" (not requiring login initially) vs "Client Portal" (full account) distinction if needed.

---

## 3. General Infrastructure & DevOps

*   **Email Functionality**: 
    *   Supabase Edge Function configured for Resend and SendGrid with environment-based selection.
*   **Production Deployment**:
    *   Setup CI/CD for both projects (Vercel configuration added, GitHub Actions for Supabase and Build verification configured).
*   **Mobile Responsiveness**:
    *   Further testing and fluid UI adjustments for the Internal Platform on mobile devices.
*   **Data Isolation Audit**:
    *   Completed and Hardened. Implemented `session_context` for absolute firm-to-firm isolation and recursive-safe RLS policies.

---

*Last Updated: 2026-02-01*
