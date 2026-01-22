# CaseBridge Internal Operations Platform

## Overview
This is the **Internal Operations Platform** for CaseBridge, designed for:
- **Admin Managers** - Firm governance and user management
- **Case Managers** - Matter intake, assignment, and status management
- **Associate Lawyers** - View and work on assigned cases

## Tech Stack
- **Frontend**: React.js (Vite), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **State Management**: TanStack Query
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Project Structure
```
Casebridge_Internal/
├── src/
│   ├── components/       # Reusable UI components
│   ├── layouts/          # Layout components (InternalLayout)
│   ├── pages/            # Page components
│   │   ├── auth/         # Login, AcceptInvite
│   │   ├── admin/        # Admin Manager module
│   │   ├── cases/        # Case Manager module
│   │   └── associate/    # Associate Lawyer module
│   ├── lib/              # Utilities (supabase, helpers)
│   └── hooks/            # Custom React hooks
├── supabase/
│   └── migrations/       # Database migrations
└── public/               # Static assets
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd Casebridge_Internal
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and add your Supabase credentials:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Database Migrations
Execute `supabase/migrations/internal_schema.sql` in your Supabase SQL Editor.

**IMPORTANT**: This must be run AFTER the client schema is already in place.

### 4. Start Development Server
```bash
npm run dev
```

## Development Phases

### ✅ PHASE 1 — FOUNDATION (COMPLETED)
- [x] Vite + React setup
- [x] Tailwind + shadcn configuration
- [x] Supabase connection
- [x] Database schema design
- [x] RLS policies
- [x] Base routing structure

### 🔄 PHASE 2 — AUTH & INVITATIONS (NEXT)
- [ ] Admin invite flow
- [ ] Invite acceptance with password setup
- [ ] Login & session handling
- [ ] Role-based route protection
- [ ] ProtectedRoute component

### 📋 PHASE 3 — ADMIN MANAGER MODULE
- [ ] Firm profile management
- [ ] User management (invite/suspend/deactivate)
- [ ] Audit log viewer

### 📋 PHASE 4 — CASE MANAGER MODULE
- [ ] Matter intake queue
- [ ] Case detail view
- [ ] Status updates
- [ ] Case assignment to associates
- [ ] Document verification

### 📋 PHASE 5 — ASSOCIATE LAWYER MODULE
- [ ] Associate dashboard
- [ ] Assigned case views (read-only status)
- [ ] Document uploads only

### 📋 PHASE 6 — NOTIFICATIONS & LOGS
- [ ] Notification system
- [ ] Notification bell with unread count
- [ ] Case timeline & logs

## Key Features

### Firm Isolation
- Every internal table includes `firm_id`
- All queries scoped by firm
- Enforced at database level via RLS

### Role-Based Access Control
- `admin_manager` - Full firm governance
- `case_manager` - Case flow control
- `associate_lawyer` - View assigned work only

### Security
- Row Level Security (RLS) on all tables
- No UI-only permission checks
- Database-first approach
- Full audit trail

## Database Schema

### Core Tables
- `firms` - Firm information
- `profiles` (extended) - User profiles with firm_id and internal_role
- `invitations` - Invite-only user onboarding
- `case_assignments` - Associate case assignments
- `case_logs` - Case activity timeline
- `audit_logs` - System-wide audit trail
- `notifications` - Real-time notifications

### Helper Functions
- `is_admin_manager()` - Check if user is admin
- `is_case_manager()` - Check if user can manage cases
- `get_user_firm_id()` - Get current user's firm

## Development Guidelines

1. **Database-First**: Design table → Apply RLS → Add logs → Build UI
2. **No Shortcuts**: No hardcoded roles, no UI-only checks
3. **Firm Isolation**: Always scope queries by firm_id
4. **Audit Everything**: Log all significant actions
5. **Stop and Ask**: If unclear, stop and ask before proceeding

## Related Projects
- **Casebridge_Client** - Client-facing portal (separate codebase)

## License
Proprietary - CaseBridge Legal Platform
