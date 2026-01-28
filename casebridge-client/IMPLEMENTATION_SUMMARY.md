# Client Auth Onboarding V1 - Implementation Summary

## Overview
Successfully implemented the Client Phase Onboarding & Auth v1 for CaseBridge.
The specialized frontend `Casebridge_client` has been created, isolated from other firm apps.

## Key Components

### 1. Project Structure
- **Path**: `c:\dev\Casebridge\casebridge-client`
- **Stack**: React + TypeScript + Vite + Supabase
- **Styling**: Vanilla CSS with Glassmorphism and "Legal Tech" dark theme.

### 2. Database Schema (db_schema.sql)
- `external_users`: Identity table with status workflow (`registered` -> `verified` -> `active`).
- `external_user_intent`: Stores onboarding answers.
- **RLS Policies**: Users can only access/edit their own data.
- **Trigger**: Automatically creates `external_user` record on Supabase Auth signup.

### 3. Authentication Flow
- **Signup**:
  - Collects Name, Email, Phone, Country.
  - Mandatory "No Lawyer-Client Relationship" acknowledgment.
  - Creates Supabase User + `external_user` (status: `registered`).
- **Verification**:
  - Email link redirects to `/verify-email`.
  - Updates status to `verified`.
  - Redirects to Onboarding.
- **Login**:
  - Checks status after auth.
  - Redirects user to the correct stage if they dropped off (e.g. verified but didn't finish onboarding).

### 4. Onboarding Flow
- **Questionnaire**:
  - Goals (Report case, track case, etc.)
  - Persona (Individual, Business, Org)
  - Urgency
- **Completion**:
  - Saves intent data.
  - Updates status to `active`.
  - Unlocks Dashboard.

### 5. Client Dashboard
- **State**: Pre-engagement.
- **Content**:
  - Welcome message.
  - Explicit status: "Registered but not engaged with any firm".
  - "Report a Case" button is explicitly disabled/placeholder for future phase.
  - Profile & Info sections.

## How to Run
1. Navigate to: `cd c:\dev\Casebridge\casebridge-client`
2. Install dependencies: `npm install` (already done)
3. Run dev server: `npm run dev`
4. **IMPORTANT**: Execute the SQL in `db_schema.sql` in your Supabase SQL Editor to set up tables and triggers.

## Environment Variables
- Ensure `.env` is populated with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
