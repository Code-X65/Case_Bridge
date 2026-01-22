# Auto-Save Court Report Attachments to Client Document Vault

## 📋 Overview

This feature automatically saves any document uploaded as part of a court report to the client's document vault. This ensures clients have immediate access to all court-related documents without manual intervention.

---

## 🎯 How It Works

### Automatic Flow

```
1. Associate Lawyer uploads court report with attachments
   ↓
2. Attachments saved to court_report_attachments table
   ↓
3. **TRIGGER FIRES AUTOMATICALLY**
   ↓
4. Each attachment is copied to documents table (client vault)
   ↓
5. Client can now access the document in their document vault
   ↓
6. Action logged in case_logs for audit trail
```

---

## 🗄️ Database Changes

### New Trigger

**`trigger_copy_court_report_attachment_to_vault`**
- Fires: AFTER INSERT on `court_report_attachments`
- Action: Copies attachment to `documents` table
- Scope: FOR EACH ROW

### New Function

**`copy_court_report_attachment_to_client_vault()`**
- Retrieves court report and matter details
- Identifies the client from the matter
- Creates document record in client's vault
- Logs the action
- Handles errors gracefully (doesn't fail court report upload)

### Columns Added to `documents` Table

| Column | Type | Purpose |
|--------|------|---------|
| `client_id` | UUID | Links document to client |
| `document_category` | TEXT | Categorizes document type |
| `description` | TEXT | Auto-generated description |
| `metadata` | JSONB | Stores source information |

### Document Categories

- `general` - General documents
- `court_report` - **Documents from court reports** ✨
- `evidence` - Evidence files
- `contract` - Contracts
- `correspondence` - Letters, emails
- `filing` - Court filings
- `other` - Miscellaneous

---

## 📊 Data Structure

### Document Record Created

When a court report attachment is uploaded, a document is created with:

```json
{
  "id": "uuid",
  "matter_id": "uuid",
  "client_id": "uuid",  // ← Client can access
  "file_name": "evidence.pdf",
  "file_path": "same/as/court/report/path",  // ← Shared storage
  "file_size": 1024000,
  "file_type": "application/pdf",
  "uploaded_by": "associate-lawyer-id",
  "document_category": "court_report",  // ← Identifies source
  "description": "Automatically saved from Court Report #123",
  "metadata": {
    "source": "court_report",
    "court_report_id": "uuid",
    "court_report_attachment_id": "uuid",
    "auto_saved": true,
    "saved_at": "2026-01-20T20:34:40Z"
  },
  "created_at": "2026-01-20T20:34:40Z"
}
```

---

## 🔒 Security & Access Control

### RLS Policies

#### Clients Can View Their Documents
```sql
CREATE POLICY "Clients can view their documents"
ON public.documents FOR SELECT
USING (
    client_id = auth.uid()
    OR
    matter_id IN (
        SELECT id FROM public.matters
        WHERE client_id = auth.uid()
    )
);
```

#### Internal Users Can View Firm Documents
```sql
CREATE POLICY "Internal users can view firm documents"
ON public.documents FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.matters m
        INNER JOIN public.profiles p ON p.firm_id = m.firm_id
        WHERE m.id = documents.matter_id
        AND p.id = auth.uid()
        AND p.status = 'active'
    )
);
```

---

## 👁️ Client Document Vault View

### `client_document_vault` View

Provides a clean interface for clients to view their documents:

```sql
SELECT * FROM client_document_vault;
```

**Returns:**
- All document fields
- Matter title and number
- Uploader name
- Source type (Court Report or Direct Upload)
- Ordered by most recent first

---

## 🚀 Deployment

### Step 1: Apply Migration

```bash
# In Supabase Dashboard SQL Editor
# Run: auto_save_court_attachments_to_client_vault.sql
```

### Step 2: Verify Installation

```sql
-- Check trigger exists
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgname = 'trigger_copy_court_report_attachment_to_vault';
-- Expected: 1 row with tgenabled = 'O' (enabled)

-- Check columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documents' 
AND column_name IN ('client_id', 'document_category', 'description', 'metadata');
-- Expected: 4 rows
```

### Step 3: Test

```sql
-- Upload a court report with attachments via the UI
-- Then check if documents were created:

SELECT 
    id,
    file_name,
    document_category,
    description,
    metadata->>'source' as source,
    created_at
FROM documents 
WHERE metadata->>'source' = 'court_report' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 💻 Frontend Integration

### No Changes Required! ✅

The feature works automatically. However, you can enhance the UI:

### Display Court Report Documents

```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

function ClientDocumentVault() {
    const { data: documents } = useQuery({
        queryKey: ['client-documents'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('client_document_vault')
                .select('*');
            
            if (error) throw error;
            return data;
        }
    });

    return (
        <div>
            <h2>My Documents</h2>
            {documents?.map(doc => (
                <div key={doc.id}>
                    <h3>{doc.file_name}</h3>
                    <p>From: {doc.source_type}</p>
                    {doc.document_category === 'court_report' && (
                        <span className="badge">Court Report</span>
                    )}
                    <p>Case: {doc.matter_title}</p>
                    <p>Uploaded by: {doc.uploaded_by_name}</p>
                </div>
            ))}
        </div>
    );
}
```

### Filter Court Report Documents

```tsx
const courtReportDocs = documents?.filter(
    doc => doc.document_category === 'court_report'
);
```

---

## 📝 Audit Trail

Every auto-saved document creates a case log entry:

```sql
SELECT * FROM case_logs 
WHERE action = 'document_auto_saved' 
ORDER BY created_at DESC;
```

**Log Details:**
```json
{
  "document_id": "uuid",
  "file_name": "evidence.pdf",
  "source": "court_report_attachment",
  "court_report_id": "uuid"
}
```

---

## ⚠️ Edge Cases Handled

### 1. Missing Client
**Scenario**: Matter has no client assigned  
**Behavior**: Warning logged, court report upload continues  
**Result**: Document not copied (no client to save to)

### 2. Missing Matter
**Scenario**: Court report references non-existent matter  
**Behavior**: Warning logged, attachment saved  
**Result**: Document not copied

### 3. Trigger Failure
**Scenario**: Any error in copy process  
**Behavior**: Error caught, logged as warning  
**Result**: Court report upload succeeds, document copy skipped

**Important**: The trigger uses `EXCEPTION WHEN OTHERS` to ensure court report uploads never fail due to document vault issues.

---

## 🔍 Monitoring & Troubleshooting

### Check Auto-Saved Documents

```sql
-- Count auto-saved documents
SELECT COUNT(*) 
FROM documents 
WHERE metadata->>'auto_saved' = 'true';

-- Recent auto-saves
SELECT 
    file_name,
    document_category,
    created_at,
    metadata->>'court_report_id' as from_report
FROM documents 
WHERE metadata->>'source' = 'court_report'
ORDER BY created_at DESC 
LIMIT 10;
```

### Check for Failures

```sql
-- Check PostgreSQL logs for warnings
-- Look for: "Failed to copy court report attachment to client vault"
```

### Verify Client Access

```sql
-- As a client, check your documents
SELECT * FROM client_document_vault;

-- Should see documents from court reports
```

---

## 🎨 UI Enhancements (Optional)

### Badge for Auto-Saved Documents

```tsx
{doc.metadata?.auto_saved && (
    <span className="badge badge-info">
        Auto-saved from Court Report
    </span>
)}
```

### Group by Source

```tsx
const groupedDocs = {
    courtReports: docs.filter(d => d.document_category === 'court_report'),
    directUploads: docs.filter(d => d.document_category !== 'court_report')
};
```

### Show Original Court Report Link

```tsx
{doc.metadata?.court_report_id && (
    <a href={`/court-reports/${doc.metadata.court_report_id}`}>
        View Original Court Report
    </a>
)}
```

---

## 📊 Benefits

✅ **Automatic**: No manual copying required  
✅ **Instant**: Documents available immediately  
✅ **Transparent**: Clients see all court documents  
✅ **Auditable**: Full trail of auto-saved documents  
✅ **Reliable**: Errors don't break court report uploads  
✅ **Efficient**: Uses same storage (no duplication)  
✅ **Secure**: RLS policies enforce access control  

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Associate Lawyer Submits Court Report with Attachments    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  court_report_attachments Table                             │
│  - court_report_id                                          │
│  - file_name, file_path, file_size, file_type              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ TRIGGER FIRES
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  copy_court_report_attachment_to_client_vault()             │
│  1. Get court report details                                │
│  2. Get matter and client_id                                │
│  3. Create document record                                  │
│  4. Log action                                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  documents Table (Client Document Vault)                    │
│  - client_id ← Client can access                            │
│  - document_category = 'court_report'                       │
│  - metadata contains source info                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Client Views Document in Their Vault                       │
│  Via: client_document_vault view                            │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Testing Checklist

- [ ] Migration applied successfully
- [ ] Trigger exists and is enabled
- [ ] Columns added to documents table
- [ ] RLS policies created
- [ ] View `client_document_vault` accessible
- [ ] Upload court report with attachments
- [ ] Verify documents created in vault
- [ ] Check client can view documents
- [ ] Verify case log entry created
- [ ] Test with missing client (should not fail)
- [ ] Confirm storage path is shared (not duplicated)

---

## 📞 Support

### Common Issues

**Q: Documents not appearing in client vault**  
**A**: Check if matter has `client_id` set:
```sql
SELECT id, title, client_id FROM matters WHERE id = 'your-matter-id';
```

**Q: Trigger not firing**  
**A**: Verify trigger is enabled:
```sql
SELECT tgenabled FROM pg_trigger 
WHERE tgname = 'trigger_copy_court_report_attachment_to_vault';
```

**Q: Court report upload fails**  
**A**: Check PostgreSQL logs. Trigger should never cause upload to fail.

---

## 🎉 Summary

This feature provides seamless document sharing between internal court reports and client document vaults. Documents uploaded by associate lawyers are automatically available to clients, improving transparency and reducing manual work.

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Date**: 2026-01-20
