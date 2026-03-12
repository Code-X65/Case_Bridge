# Calendar Integration Testing Guide

This document provides comprehensive testing procedures for the CaseBridge Calendar Two-Way Sync feature.

---

## Table of Contents

1. [Test Scenarios](#test-scenarios)
2. [Manual Test Commands](#manual-test-commands)
3. [Post-Deployment Checklist](#post-deployment-checklist)
4. [Security Testing](#security-testing)
5. [Troubleshooting](#troubleshooting)

---

## Test Scenarios

### 1. OAuth Connection

| Test Case                                         | Expected Result                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Google OAuth flow completes successfully          | User redirected to Google, authorizes, returns to app with connected status    |
| Microsoft OAuth flow completes successfully       | User redirected to Microsoft, authorizes, returns to app with connected status |
| Tokens are stored correctly in database           | Access token and refresh token appear in `user_calendar_connections` table     |
| Connection appears in user's calendar connections | Calendar selector shows connected provider with active status                  |
| OAuth failure is handled gracefully               | Error message displayed, user can retry                                        |
| Expired OAuth tokens prompt re-authentication     | User redirected to OAuth flow when token refresh fails                         |

### 2. Calendar Sync

| Test Case                                | Expected Result                                        |
| ---------------------------------------- | ------------------------------------------------------ |
| Manual sync triggers successfully        | Sync job starts, progress indicator shows              |
| Events are pushed to external calendar   | Events created in Google/Outlook calendar              |
| Events are pulled from external calendar | External events appear in CaseBridge calendar          |
| Event mappings are created correctly     | `calendar_event_mappings` table has correct references |
| Sync conflicts are handled               | Later sync wins, audit log captures conflict           |
| Partial sync failures don't crash        | Failed events logged, successful events sync           |

### 3. Token Refresh

| Test Case                                  | Expected Result                              |
| ------------------------------------------ | -------------------------------------------- |
| Expired tokens are refreshed automatically | New tokens stored in database                |
| Refresh failures are handled gracefully    | User notified, connection marked for re-auth |
| User is notified of auth issues            | Toast notification appears                   |
| Token refresh runs on schedule             | Hourly cron job updates tokens before expiry |

### 4. Scheduled Sync

| Test Case                                 | Expected Result                                 |
| ----------------------------------------- | ----------------------------------------------- |
| Cron job runs hourly                      | `calendar_sync_job()` executes every hour       |
| Sync completes for all active connections | All `sync_enabled = true` connections processed |
| Errors are logged properly                | Failed syncs logged to `calendar_sync_logs`     |
| Rate limiting prevents abuse              | Too many failures locks connection temporarily  |

### 5. Security

| Test Case                            | Expected Result                                           |
| ------------------------------------ | --------------------------------------------------------- |
| Rate limiting prevents abuse         | After 5 failures, `is_locked = true`                      |
| Audit logs capture all operations    | All OAuth, sync, and error events in `calendar_audit_log` |
| Users can only access their own data | RLS policies enforced                                     |
| Webhook signatures are verified      | Invalid signatures rejected                               |
| Sensitive tokens are encrypted       | Token columns use encryption                              |

---

## Manual Test Commands

### Database Queries

```sql
-- Check active calendar connections
SELECT
  id,
  user_id,
  provider,
  sync_enabled,
  is_locked,
  sync_failure_count,
  last_sync_attempt,
  created_at
FROM public.user_calendar_connections
WHERE sync_enabled = true;

-- Check recent sync logs
SELECT
  id,
  connection_id,
  status,
  events_synced,
  error_message,
  started_at,
  completed_at
FROM public.calendar_sync_logs
ORDER BY started_at DESC
LIMIT 20;

-- Check audit logs
SELECT
  id,
  user_id,
  action,
  provider,
  details,
  created_at
FROM public.calendar_audit_log
ORDER BY created_at DESC
LIMIT 50;

-- Test rate limit function (replace USER_ID_HERE with actual UUID)
SELECT public.check_calendar_sync_rate_limit('USER_ID_HERE');

-- Test recording sync attempt
SELECT public.record_calendar_sync_attempt('USER_ID_HERE', true);  -- Success
SELECT public.record_calendar_sync_attempt('USER_ID_HERE', false); -- Failure

-- Unlock a locked connection
SELECT public.unlock_calendar_connection('USER_ID_HERE');

-- Check event mappings
SELECT
  em.id,
  em.casebridge_event_id,
  em.external_event_id,
  em.provider,
  em.created_at
FROM public.calendar_event_mappings em
LIMIT 20;
```

### Edge Function Testing

```bash
# Test calendar-sync edge function
supabase functions serve calendar-sync

# Test calendar-refresh-token edge function
supabase functions serve calendar-refresh-token

# Test calendar-webhook edge function
supabase functions serve calendar-webhook
```

### API Endpoint Testing

```bash
# Get calendar connections
curl -X GET "https://your-project.supabase.co/functions/v1/calendar-sync" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Trigger manual sync
curl -X POST "https://your-project.supabase.co/functions/v1/calendar-sync" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"connection_id": "CONNECTION_ID"}'

# Test webhook endpoint
curl -X POST "https://your-project.supabase.co/functions/v1/calendar-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type": "sync", "provider": "google"}'
```

---

## Post-Deployment Checklist

### Database Migrations

- [ ] Run Phase 1 migration: `20260315_CALENDAR_SYNC_PHASE1.sql`
- [ ] Run Phase 5 migration: `20260315_CALENDAR_CRON_SETUP.sql`
- [ ] Run Phase 6 migration: `20260315_CALENDAR_SECURITY.sql`
- [ ] Verify all new tables exist
- [ ] Verify RLS policies are enabled

### Edge Functions

- [ ] Deploy `calendar-sync` edge function
- [ ] Deploy `calendar-refresh-token` edge function
- [ ] Deploy `calendar-webhook` edge function
- [ ] Configure environment variables
- [ ] Test each function individually

### OAuth Configuration

- [ ] Configure Google OAuth credentials in Supabase
  - [ ] Client ID set
  - [ ] Client secret set
  - [ ] Redirect URI configured
- [ ] Configure Microsoft OAuth credentials in Supabase
  - [ ] Client ID set
  - [ ] Client secret set
  - [ ] Redirect URI configured
- [ ] Add OAuth redirect URLs to Google Cloud Console
- [ ] Add OAuth redirect URLs to Azure Portal

### Environment Setup

- [ ] Set `CALENDAR_SECRET_KEY` in Supabase Edge Functions
- [ ] Configure webhook URLs in external calendars
- [ ] Set up cron job schedule (hourly)
- [ ] Configure rate limiting parameters

### Testing - Development

- [ ] Test OAuth flow with Google (development)
- [ ] Test OAuth flow with Microsoft (development)
- [ ] Verify calendar sync works in development
- [ ] Test manual sync trigger
- [ ] Verify event creation and updates
- [ ] Test token refresh mechanism
- [ ] Test rate limiting behavior

### Testing - Production

- [ ] Test OAuth flow with Google (production)
- [ ] Test OAuth flow with Microsoft (production)
- [ ] Verify calendar sync works in production
- [ ] Check cron job is scheduled correctly
- [ ] Monitor sync logs for errors
- [ ] Verify audit logs are being created
- [ ] Test webhook notifications

### Security Testing

- [ ] Verify RLS policies are working
- [ ] Test cross-user data access (should be denied)
- [ ] Verify rate limiting kicks in after failures
- [ ] Test audit log captures all operations
- [ ] Verify webhook signature verification

---

## Security Testing

### Rate Limiting Tests

```sql
-- Simulate 5 failed sync attempts
UPDATE public.user_calendar_connections
SET sync_failure_count = 4
WHERE user_id = 'USER_ID_HERE';

-- 6th attempt should fail due to rate limiting
SELECT public.check_calendar_sync_rate_limit('USER_ID_HERE');
-- Expected: false

-- Verify connection is locked
SELECT is_locked FROM public.user_calendar_connections WHERE user_id = 'USER_ID_HERE';
-- Expected: true
```

### RLS Policy Tests

```sql
-- Test that users can only see their own connections
SELECT * FROM public.user_calendar_connections
WHERE user_id = auth.uid();

-- Test that users can only see their own audit logs
SELECT * FROM public.calendar_audit_log
WHERE user_id = auth.uid();
```

### Audit Log Tests

```sql
-- Log a test audit event
SELECT public.log_calendar_audit_event(
  'USER_ID_HERE',
  'oauth_connected',
  'google',
  'CONNECTION_ID_HERE',
  '192.168.1.1',
  'Mozilla/5.0',
  '{"event": "test"}'::jsonb
);

-- Verify audit log entry
SELECT * FROM public.calendar_audit_log
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 1;
```

---

## Troubleshooting

### Common Issues

| Issue                             | Possible Cause                           | Solution                         |
| --------------------------------- | ---------------------------------------- | -------------------------------- |
| OAuth fails with "invalid grant"  | Authorization code expired or used twice | Generate new authorization URL   |
| Sync fails with "token expired"   | Access token expired                     | Trigger token refresh manually   |
| Rate limit triggered accidentally | Network issues causing failures          | Unlock connection manually       |
| Webhook not received              | Incorrect webhook URL                    | Verify webhook endpoint URL      |
| Events not syncing                | Sync disabled on connection              | Enable sync in calendar settings |

### Log Analysis

```sql
-- Find recent errors
SELECT * FROM public.calendar_sync_logs
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 10;

-- Find user's audit trail
SELECT * FROM public.calendar_audit_log
WHERE user_id = 'USER_ID_HERE'
ORDER BY created_at DESC;

-- Check for stuck syncs
SELECT * FROM public.calendar_sync_logs
WHERE status = 'in_progress'
AND started_at < NOW() - INTERVAL '30 minutes';
```

---

## Document Information

- **Version:** 1.0
- **Last Updated:** 2026-03-12
- **Author:** CaseBridge Development Team
- **Migration Files Required:**
  - `20260315_CALENDAR_SYNC_PHASE1.sql`
  - `20260315_CALENDAR_CRON_SETUP.sql`
  - `20260315_CALENDAR_SECURITY.sql`
