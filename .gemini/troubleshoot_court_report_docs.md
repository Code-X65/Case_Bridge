# Troubleshooting: Court Report Documents Not Showing

## Issue
The document section in the case report list is showing empty even though attachments were uploaded.

---

## Diagnostic Steps

### Step 1: Check Browser Console
Open the browser console (F12) and look for these logs when viewing the court reports list:

**Expected Output:**
```javascript
Fetched court reports: [{id: "...", attachments: [...]}]
Reports count: 1
First report attachments: [{id: "...", file_name: "document.pdf", ...}]
```

**If you see:**
```javascript
Fetched court reports: [{id: "...", attachments: []}]
First report attachments: []
```
→ **Problem**: Attachments aren't in the database

**If you see:**
```javascript
Fetched court reports: [{id: "...", attachments: null}]
```
→ **Problem**: Query relationship issue or RLS blocking

---

### Step 2: Check Supabase Database

#### A. Check if `court_report_attachments` table exists
1. Go to Supabase Dashboard
2. Navigate to Table Editor
3. Look for `court_report_attachments` table

**If table doesn't exist:**
→ **Solution**: Run the migration `case_lifecycle_simplified.sql`

#### B. Check if records exist
Run this query in SQL Editor:
```sql
SELECT * FROM public.court_report_attachments;
```

**If no records:**
→ **Problem**: Attachments aren't being created during submission

**If records exist:**
→ **Problem**: RLS policy is blocking reads

---

### Step 3: Check Storage Bucket

1. Go to Supabase Dashboard → Storage
2. Look for `court-reports` bucket

**If bucket doesn't exist:**
→ **Solution**: Create the bucket:
```sql
-- In Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public)
VALUES ('court-reports', 'court-reports', true);
```

**If bucket exists, check for files:**
- Navigate into the bucket
- Look for folders named with UUIDs (report IDs)
- Check if files are inside

---

### Step 4: Check RLS Policies

Run this query to check if RLS is blocking:
```sql
-- Temporarily disable RLS to test (DO NOT DO IN PRODUCTION)
ALTER TABLE public.court_report_attachments DISABLE ROW LEVEL SECURITY;

-- Then try fetching again
SELECT * FROM public.court_report_attachments;

-- Re-enable RLS
ALTER TABLE public.court_report_attachments ENABLE ROW LEVEL SECURITY;
```

**If data appears when RLS is disabled:**
→ **Problem**: RLS policy is too restrictive

---

## Common Issues & Solutions

### Issue 1: Migration Not Run
**Symptom**: Tables don't exist  
**Solution**:
```bash
cd CaseBridge_Internal
supabase db push
```

Or run the SQL manually in Supabase Dashboard.

---

### Issue 2: Storage Bucket Missing
**Symptom**: File upload errors in console  
**Solution**: Create bucket in Supabase Dashboard:
1. Go to Storage
2. Click "New bucket"
3. Name: `court-reports`
4. Public: Yes
5. Create

---

### Issue 3: RLS Policy Too Restrictive
**Symptom**: Records exist but query returns empty  
**Solution**: Check the RLS policy in the migration:

The policy should allow:
- Internal users (same firm) to view attachments
- Clients to view attachments for their cases

**Debug query:**
```sql
-- Check what the current user can see
SELECT 
    cra.*,
    cr.matter_id,
    m.firm_id,
    m.client_id,
    p.firm_id as user_firm_id,
    p.internal_role
FROM court_report_attachments cra
JOIN court_reports cr ON cr.id = cra.court_report_id
JOIN matters m ON m.id = cr.matter_id
CROSS JOIN profiles p
WHERE p.id = auth.uid();
```

---

### Issue 4: Attachment Insert Failing
**Symptom**: Files upload but no database records  
**Solution**: Check console for errors during submission

**Common errors:**
- `foreign key violation` → report_id doesn't exist
- `permission denied` → RLS blocking insert
- `column does not exist` → migration not run

---

### Issue 5: Wrong Foreign Key Name
**Symptom**: Query returns null for attachments  
**Solution**: The query uses:
```typescript
attachments:court_report_attachments(*)
```

This should match the foreign key `court_report_id` in the `court_report_attachments` table.

---

## Testing Checklist

### Test 1: Manual Database Insert
Try inserting a record manually:
```sql
-- Get a report ID
SELECT id FROM court_reports LIMIT 1;

-- Insert test attachment
INSERT INTO court_report_attachments (
    court_report_id,
    file_name,
    file_path,
    file_size,
    file_type
) VALUES (
    'YOUR_REPORT_ID_HERE',
    'test.pdf',
    'test-folder/test.pdf',
    1024,
    'application/pdf'
);

-- Check if it appears
SELECT * FROM court_report_attachments;
```

**If insert succeeds:**
→ Problem is in the frontend upload code

**If insert fails:**
→ Problem is with RLS or table structure

---

### Test 2: Check Frontend Submission
1. Open browser console
2. Submit a court report with attachments
3. Look for these logs:

```javascript
RPC Response: {report_id: "...", is_first_report: true}
Uploading 1 attachments for report ...
Uploading file: document.pdf as .../document.pdf
File uploaded successfully: .../document.pdf
Attachment record created for: document.pdf  // ← Should see this
```

**If you don't see "Attachment record created":**
→ Check for error logs just before it

---

### Test 3: Direct Query
In browser console, run:
```javascript
const { data, error } = await supabase
    .from('court_report_attachments')
    .select('*');
console.log('Attachments:', data, error);
```

**If error:**
→ RLS is blocking

**If empty array:**
→ No records in database

**If data appears:**
→ Problem is with the join query

---

## Quick Fixes

### Fix 1: Ensure Migration is Applied
```bash
cd CaseBridge_Internal
supabase db push
```

### Fix 2: Create Storage Bucket
Via Supabase Dashboard:
1. Storage → New Bucket
2. Name: `court-reports`
3. Public: Yes

### Fix 3: Check RLS Policies
```sql
-- View current policies
SELECT * FROM pg_policies 
WHERE tablename = 'court_report_attachments';

-- If needed, recreate policies from migration file
```

### Fix 4: Verify Foreign Key
```sql
-- Check foreign key exists
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'court_report_attachments'
    AND tc.constraint_type = 'FOREIGN KEY';
```

---

## Expected Data Flow

### Successful Submission:
```
1. User submits report
   ↓
2. RPC creates court_reports record
   ↓
3. RPC returns report_id
   ↓
4. Frontend uploads file to storage
   ✓ File in storage: court-reports/{report_id}/file.pdf
   ↓
5. Frontend creates attachment record
   ✓ Record in court_report_attachments table
   ↓
6. Query fetches reports with attachments
   ✓ Attachments appear in list
```

---

## Next Steps

1. **Check console logs** when viewing the reports list
2. **Verify migration** has been applied
3. **Check storage bucket** exists
4. **Test manual insert** to isolate the issue
5. **Review RLS policies** if needed

---

## Contact Points

If issue persists, provide:
- Console logs from submission
- Console logs from viewing reports
- Screenshot of Supabase table structure
- Any error messages

This will help diagnose the exact issue.
