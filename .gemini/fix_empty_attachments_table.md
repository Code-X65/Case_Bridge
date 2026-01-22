# Fix: Court Report Attachments Table Empty

## Issue Confirmed
The `court_report_attachments` table is empty even though files are being uploaded to storage.

---

## Root Cause: RLS Policy Bug

### The Problem
The RLS policy for INSERT on `court_report_attachments` has a subtle bug:

**Original Policy (BROKEN):**
```sql
CREATE POLICY "Lawyers can upload report attachments"
ON public.court_report_attachments FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.court_reports cr
        WHERE cr.id = court_report_attachments.court_report_id  -- ❌ WRONG
        AND cr.associate_id = auth.uid()
    )
);
```

**The Issue:**
- During an INSERT, `court_report_attachments.court_report_id` references the table itself
- But the row doesn't exist yet, so this reference is ambiguous
- PostgreSQL might interpret this incorrectly, causing the policy to fail
- Result: INSERT is blocked, no error is shown to the user

---

## The Fix

### Corrected Policy:
```sql
CREATE POLICY "Lawyers can upload report attachments"
ON public.court_report_attachments FOR INSERT
WITH CHECK (
    -- Check if user is an associate lawyer
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
        AND internal_role = 'associate_lawyer'
        AND status = 'active'
    )
    AND
    -- Check if the court report exists and belongs to this user
    EXISTS (
        SELECT 1 FROM public.court_reports cr
        WHERE cr.id = court_report_id  -- ✅ CORRECT - references the NEW value
        AND cr.associate_id = auth.uid()
    )
);
```

**What Changed:**
- Changed `court_report_attachments.court_report_id` to just `court_report_id`
- In an INSERT policy, unqualified column names refer to the NEW values being inserted
- Added explicit check for associate_lawyer role
- This ensures the policy correctly validates the insert

---

## How to Apply the Fix

### Option 1: Run the Migration File (Recommended)
```bash
cd CaseBridge_Internal
supabase db push
```

This will apply the new migration file: `fix_court_report_attachments_rls.sql`

### Option 2: Run SQL Directly
1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `fix_court_report_attachments_rls.sql`
4. Execute the SQL

### Option 3: Manual Fix via Dashboard
1. Go to Supabase Dashboard → Authentication → Policies
2. Find table: `court_report_attachments`
3. Delete the policy: "Lawyers can upload report attachments"
4. Create new policy:
   - Name: "Lawyers can upload report attachments"
   - Policy command: INSERT
   - WITH CHECK expression: (paste the corrected policy)

---

## Testing After Fix

### Step 1: Verify Policy is Updated
In Supabase SQL Editor:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'court_report_attachments' 
AND policyname = 'Lawyers can upload report attachments';
```

### Step 2: Test Insert
Try submitting a court report with attachments.

**Check console for:**
```javascript
Uploading file: document.pdf as .../document.pdf
File uploaded successfully: .../document.pdf
Attachment record created for: document.pdf  // ← Should appear now!
```

### Step 3: Verify Database
In Supabase SQL Editor:
```sql
SELECT * FROM public.court_report_attachments;
```

**Should now show records!**

### Step 4: Check UI
Refresh the court reports list - the "Docs" column should now show the attachment count.

---

## Why This Happened

### RLS Policy Gotchas
In PostgreSQL RLS policies:
- **Qualified names** (`table.column`) in INSERT policies can be ambiguous
- **Unqualified names** (`column`) refer to the NEW row being inserted
- The original migration had `court_report_attachments.court_report_id` which PostgreSQL might interpret as the existing table, not the NEW row

### Best Practice
For INSERT policies, always use unqualified column names:
```sql
-- ❌ WRONG
WHERE cr.id = court_report_attachments.court_report_id

-- ✅ CORRECT
WHERE cr.id = court_report_id
```

---

## What Happens After Fix

### Before (Broken):
```
1. User submits report with attachment
   ↓
2. File uploads to storage ✅
   ↓
3. Try to insert into court_report_attachments
   ↓
4. RLS policy fails silently ❌
   ↓
5. No database record created
   ↓
6. UI shows empty documents
```

### After (Fixed):
```
1. User submits report with attachment
   ↓
2. File uploads to storage ✅
   ↓
3. Try to insert into court_report_attachments
   ↓
4. RLS policy passes ✅
   ↓
5. Database record created ✅
   ↓
6. UI shows attachment count ✅
```

---

## Verification Checklist

After applying the fix:
- [ ] Run the migration or SQL
- [ ] Submit a test court report with attachments
- [ ] Check console for "Attachment record created"
- [ ] Verify `court_report_attachments` table has records
- [ ] Refresh court reports list
- [ ] See attachment count in "Docs" column
- [ ] Click "View Details" to see attachments
- [ ] Download attachments successfully

---

## Additional Notes

### If Issue Persists
If attachments still don't appear after applying the fix:

1. **Check console for errors** during submission
2. **Verify the policy was updated**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'court_report_attachments';
   ```
3. **Test with RLS disabled** (temporarily):
   ```sql
   ALTER TABLE court_report_attachments DISABLE ROW LEVEL SECURITY;
   -- Try insert
   ALTER TABLE court_report_attachments ENABLE ROW LEVEL SECURITY;
   ```

### Security Note
The fixed policy maintains the same security:
- Only active associate lawyers can upload
- Only to their own court reports
- Clients and other users cannot upload

---

## Summary

**Issue**: RLS policy blocking inserts  
**Cause**: Ambiguous column reference in policy  
**Fix**: Use unqualified column name  
**Status**: ✅ **READY TO APPLY**  

**Migration File**: `fix_court_report_attachments_rls.sql`  
**Action Required**: Run `supabase db push` or execute SQL manually  

---

**Created**: 2026-01-16  
**Priority**: High (blocking feature)  
**Impact**: Enables court report attachments
