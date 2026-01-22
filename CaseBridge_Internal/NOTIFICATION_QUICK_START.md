# 🚀 Notification System - Quick Start Guide

## ⚡ Get Started in 5 Minutes

---

## Step 1: Apply Database Migration (2 minutes)

### Option A: Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/case_manager_notifications.sql`
5. Paste into the editor
6. Click **Run** (or press Ctrl+Enter)
7. Wait for "Success. No rows returned" message

### Option B: Supabase CLI
```bash
cd c:\dev\Casebridge\CaseBridge_Internal
supabase db push
```

---

## Step 2: Verify Installation (1 minute)

Run this query in SQL Editor:

```sql
-- Should return 27 rows
SELECT COUNT(*) FROM notification_event_types;

-- Should return 'notifications'
SELECT tablename FROM pg_tables 
WHERE tablename = 'notifications';

-- Should return true
SELECT rowsecurity FROM pg_tables 
WHERE tablename = 'notifications';
```

✅ **All checks passed?** Continue to Step 3!

---

## Step 3: Add NotificationBell to UI (2 minutes)

Find your main header/navbar component and add:

```tsx
import NotificationBell from '@/components/notifications/NotificationBell';
import { useNotificationSubscription } from '@/hooks/useNotifications';

export function AppHeader() {
    const { data: profile } = useCurrentUser();
    
    // Enable real-time notifications
    useNotificationSubscription();
    
    return (
        <header className="flex items-center justify-between p-4">
            <h1>CaseBridge</h1>
            
            {/* Add this */}
            {profile?.internal_role === 'case_manager' && (
                <NotificationBell />
            )}
        </header>
    );
}
```

---

## Step 4: Test It! (30 seconds)

### Create a Test Notification

Run this in SQL Editor (replace UUIDs with real ones from your database):

```sql
-- Get a firm_id
SELECT id, name FROM firms LIMIT 1;

-- Get a case_id
SELECT id, title FROM matters LIMIT 1;

-- Create test notification
SELECT public.create_notification_for_case_managers(
    'YOUR-FIRM-ID'::UUID,
    'case_created',
    'YOUR-CASE-ID'::UUID,
    auth.uid(),
    '{}'::JSONB
);
```

### Check the UI

1. Log in as a **Case Manager**
2. Look for the bell icon 🔔 in your header
3. You should see a red badge with "1"
4. Click the bell to see your test notification!

---

## 🎉 You're Done!

The notification system is now live and will automatically notify Case Managers when:

✅ Cases are created or assigned  
✅ Case status changes  
✅ Court reports are submitted  
✅ Documents are uploaded  
✅ Deadlines are approaching  
✅ And 22 more event types!

---

## 📚 Next Steps

### Learn More
- Read `NOTIFICATION_SYSTEM_GUIDE.md` for complete documentation
- Check `src/lib/notificationExamples.ts` for integration examples
- Review `NOTIFICATION_IMPLEMENTATION_SUMMARY.md` for full feature list

### Customize
- Add more event types in `notification_event_types` table
- Customize notification templates
- Add email/SMS delivery (future enhancement)

### Monitor
```sql
-- View all notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Check unread count per user
SELECT recipient_user_id, COUNT(*) 
FROM notifications 
WHERE read_at IS NULL 
GROUP BY recipient_user_id;

-- Most common event types
SELECT event_type, COUNT(*) 
FROM notifications 
GROUP BY event_type 
ORDER BY COUNT(*) DESC;
```

---

## ⚠️ Troubleshooting

### "No notifications appearing"
**Check**: Is the user a Case Manager?
```sql
SELECT id, email, internal_role, status 
FROM profiles 
WHERE id = auth.uid();
```
Must be: `internal_role = 'case_manager'` AND `status = 'active'`

### "Bell icon not showing"
**Check**: Is the role check correct in your header component?
```tsx
{profile?.internal_role === 'case_manager' && <NotificationBell />}
```

### "Real-time not working"
**Check**: Is Supabase Realtime enabled?
1. Go to Supabase Dashboard
2. Settings → API
3. Realtime → Enable for `notifications` table

### "Migration failed"
**Check**: Do these tables exist?
- `profiles` (with `internal_role` column)
- `firms`
- `matters`
- `case_assignments`

---

## 🔥 Pro Tips

### Enable Browser Notifications
```tsx
import { requestNotificationPermission } from '@/hooks/useNotifications';

// In your app initialization or settings page
useEffect(() => {
    if (profile?.internal_role === 'case_manager') {
        requestNotificationPermission();
    }
}, [profile]);
```

### Get Unread Count Anywhere
```tsx
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

function MyComponent() {
    const { data: unreadCount } = useUnreadNotificationCount();
    
    return <span>You have {unreadCount} unread notifications</span>;
}
```

### Trigger Custom Notifications
```typescript
import { supabase } from '@/lib/supabase';

// When something important happens
await supabase.rpc('create_notification_for_case_managers', {
    p_firm_id: firmId,
    p_event_type: 'case_flagged',
    p_case_id: caseId,
    p_triggered_by: userId,
    p_metadata: {
        reason: 'High-risk case',
        priority: 'urgent'
    }
});
```

---

## ✅ Success Checklist

- [ ] Migration applied successfully
- [ ] 27 event types in database
- [ ] RLS enabled on notifications table
- [ ] NotificationBell added to header
- [ ] Real-time subscription active
- [ ] Test notification created
- [ ] Bell icon shows with badge
- [ ] Clicking bell shows notifications
- [ ] Mark as read works
- [ ] Automatic triggers fire (test by changing case status)

---

## 🆘 Need Help?

1. Check `NOTIFICATION_SYSTEM_GUIDE.md` for detailed docs
2. Review `notificationExamples.ts` for code samples
3. Verify database setup with verification queries
4. Check browser console for errors
5. Ensure user is logged in as Case Manager

---

**That's it!** You now have a fully functional, production-ready notification system! 🎊

---

**Quick Reference Card**

```typescript
// Import hooks
import {
    useUnreadNotifications,
    useUnreadNotificationCount,
    useMarkNotificationRead,
    useNotificationSubscription
} from '@/hooks/useNotifications';

// Import component
import NotificationBell from '@/components/notifications/NotificationBell';

// Create notification (backend)
await supabase.rpc('create_notification_for_case_managers', {
    p_firm_id: string,
    p_event_type: string,
    p_case_id?: string,
    p_triggered_by?: string,
    p_metadata?: object
});
```

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-18  
**Status**: Production Ready ✅
