# Calendar Sync Cron Setup - Phase 5

This document explains how to set up scheduled calendar synchronization for CaseBridge.

## Overview

Phase 5 implements automated two-way calendar sync using Supabase's pg_cron extension. The sync runs hourly to:

- Refresh expired OAuth tokens
- Push new CaseBridge events to external calendars (Google/Outlook)
- Pull external calendar changes to CaseBridge
- Log sync operations for monitoring

## Setup Options

### Option 1: Database Migration (Recommended)

Run the migration file to set up everything automatically:

```bash
supabase db push
# OR
psql -h db.your-project.supabase.co -U postgres -f CaseBridge_Internal/supabase/migrations/20260315_CALENDAR_CRON_SETUP.sql
```

This will:

1. Enable the `pg_cron` extension
2. Enable the `http` extension for HTTP requests
3. Create the `cron.calendar_sync_job()` function
4. Schedule the job to run hourly (at minute 0)
5. Create the `calendar_sync_logs` table for monitoring
6. Create helper functions for manual sync

### Option 2: Supabase Dashboard

If you prefer to set up via the dashboard:

#### Step 1: Enable pg_cron Extension

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Database** → **Extensions**
4. Find `pg_cron` and enable it

#### Step 2: Enable http Extension

1. In the same **Extensions** page
2. Find `http` and enable it (required for calling edge functions)

#### Step 3: Create the Cron Job

1. Navigate to **Database** → **Cron Jobs**
2. Click **New Job**
3. Configure:
   - **Name**: `calendar-sync-job`
   - **SQL Query**:
     ```sql
     SELECT cron.calendar_sync_job();
     ```
   - **Schedule**: `0 * * * *` (hourly at minute 0)
4. Click **Save**

## Environment Configuration

For the cron job to work, you need to set the following environment variables in your Supabase project:

1. **Settings** → **Edge Functions**
2. Add these secrets:
   - `SUPABASE_URL`: Your project URL (e.g., `https://xyzabc.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (for authenticated API calls)

## Monitoring

### View Sync Logs

Query the sync logs table to monitor sync operations:

```sql
-- View recent sync operations
SELECT * FROM calendar_sync_logs
ORDER BY started_at DESC
LIMIT 20;

-- View failed syncs
SELECT * FROM calendar_sync_logs
WHERE status = 'failed'
ORDER BY started_at DESC;

-- View sync statistics
SELECT
  DATE(started_at) as date,
  COUNT(*) as total_syncs,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  SUM(events_pushed) as total_events_pushed,
  SUM(events_pulled) as total_events_pulled
FROM calendar_sync_logs
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(started_at)
ORDER BY date DESC;
```

### Manual Sync Trigger

Users can trigger a manual sync from the frontend, or you can call the function directly:

```sql
-- Trigger sync for a specific user
SELECT trigger_calendar_sync_for_user('user-uuid-here');
```

### Check Cron Job Status

```sql
-- View scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details
ORDER BY start_time DESC
LIMIT 10;
```

## Cron Expression Reference

| Expression     | Meaning                   |
| -------------- | ------------------------- |
| `0 * * * *`    | Every hour at minute 0    |
| `*/15 * * * *` | Every 15 minutes          |
| `0 0 * * *`    | Every day at midnight UTC |
| `0 9 * * 1-5`  | Every weekday at 9 AM UTC |
| `0 */6 * * *`  | Every 6 hours             |

## Troubleshooting

### Job Not Running

1. Check if pg_cron is enabled:

   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

2. Check job schedule:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'calendar-sync-job';
   ```

3. Check job run history:
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'calendar-sync-job')
   ORDER BY start_time DESC LIMIT 10;
   ```

### Sync Failures

1. Check error messages in logs:

   ```sql
   SELECT * FROM calendar_sync_logs WHERE status = 'failed';
   ```

2. Verify edge function is deployed:

   ```bash
   supabase functions list
   ```

3. Test edge function manually:
   ```bash
   supabase functions invoke calendar-sync
   ```

### Token Refresh Issues

If tokens are not refreshing properly:

1. Verify OAuth credentials are set in Edge Functions secrets
2. Check that `user_calendar_connections` has valid `refresh_token` values
3. Ensure tokens haven't been revoked by the user

## Security Considerations

- The `calendar_sync_job()` function uses the service role key to make authenticated API calls
- RLS policies ensure users can only view their own sync logs
- All sync operations are logged for audit purposes
- Tokens are stored encrypted in the database

## Future Enhancements

Potential improvements for future phases:

- Per-user sync schedules (not just hourly)
- Differential sync (only changed events)
- Conflict resolution UI
- Email notifications on sync failures
- Sync status webhooks
