# DOCUMENT SUBMISSION & FETCHING - COMPLETE ANALYSIS

## 📊 CURRENT STATE ANALYSIS

### **Client Side (Casebridge-client)**

#### 1. **Case Submission (NewCase.tsx)**
**Inserts into:** `case_report_documents`
**Columns used:**
- `case_report_id` ✅
- `firm_id` ✅
- `file_name` ✅
- `file_path` ✅
- `file_type` ✅
- `file_size` ✅
- `is_client_visible` ✅

**Storage:** `case_documents` bucket

#### 2. **Document Fetching (GlobalDocuments.tsx)**
**Queries:**
```sql
matters {
  case_documents(client_visible, document:document_id(...))
  matter_updates(client_visible, report_documents(client_visible, document:document_id(...)))
  case_report:case_report_id(case_report_documents(...))
}
```

**Expected tables:**
- `case_documents` (links documents to matters)
- `report_documents` (links documents to progress reports)
- `documents` (actual document records)
- `case_report_documents` (intake documents)

---

### **Internal Side (CaseBridge_Internal)**

#### 1. **Progress Report Submission (MatterWorkspace.tsx)**
**Flow:**
1. Insert into `matter_updates` table
2. Upload files to storage
3. Insert into `documents` table with columns:
   - `filename` ✅
   - `file_url` ✅
   - `uploaded_by_user_id` ✅
   - `uploaded_by_role` ✅
4. Insert into `report_documents` table with columns:
   - `report_id` ✅
   - `document_id` ✅
   - `client_visible` ✅

#### 2. **Document Fetching (InternalDocumentVault.tsx)**
**Queries:**
```sql
matters {
  report_documents(document:document_id(...))
  case_report_documents(...)
  case_report:case_report_id(case_report_documents(...))
}
case_reports {
  case_report_documents(...)
}
```

---

## ✅ REQUIRED TABLES & COLUMNS

### **1. documents**
```sql
- id (UUID, PK)
- filename (TEXT) ✅
- file_url (TEXT) ✅
- uploaded_by_user_id (UUID) ✅
- uploaded_by_role (TEXT) ✅
- uploaded_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

### **2. case_documents**
```sql
- id (UUID, PK)
- matter_id (UUID) ✅
- document_id (UUID) ✅
- client_visible (BOOLEAN) ✅
- created_at (TIMESTAMPTZ)
```

### **3. report_documents**
```sql
- id (UUID, PK)
- report_id (UUID) ✅ (references matter_updates.id)
- document_id (UUID) ✅ (references documents.id)
- client_visible (BOOLEAN) ✅
- created_at (TIMESTAMPTZ)
```

### **4. case_report_documents**
```sql
- id (UUID, PK)
- case_report_id (UUID) ✅
- firm_id (UUID) ✅
- file_name (TEXT) ✅
- file_path (TEXT) ✅
- file_type (TEXT) ✅
- file_size (BIGINT) ✅
- is_client_visible (BOOLEAN) ✅
- uploaded_by_user_id (UUID)
- uploaded_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
```

### **5. matter_updates**
```sql
- id (UUID, PK)
- matter_id (UUID) ✅
- author_id (UUID) ✅
- author_role (TEXT) ✅
- title (TEXT) ✅
- content (TEXT) ✅
- client_visible (BOOLEAN) ✅
- is_final (BOOLEAN) ✅
- created_at (TIMESTAMPTZ)
```

---

## 🔍 POTENTIAL ISSUES FOUND

### **Issue 1: Missing firm_id in case_report_documents**
**Location:** `COMPLETE_SCHEMA_FIX.sql` line 265
**Status:** ✅ FIXED - firm_id column added

### **Issue 2: Client query expects nested relationships**
**Location:** `GlobalDocuments.tsx` line 59-79
**Requirement:** 
- `case_documents` must have foreign key to `documents`
- `report_documents` must have foreign key to `documents`
- Both need proper column names for Supabase joins

**Status:** ✅ FIXED in COMPLETE_SCHEMA_FIX.sql

### **Issue 3: RLS Policies**
**Required policies:**
- Staff can manage all documents ✅
- Clients can view documents where:
  - `case_documents.client_visible = TRUE` AND linked to their matter
  - `report_documents.client_visible = TRUE` AND linked to their matter
  - `case_report_documents.is_client_visible = TRUE` AND linked to their case_report

**Status:** ✅ FIXED in COMPLETE_SCHEMA_FIX.sql

---

## 📋 VERIFICATION CHECKLIST

Run this after executing COMPLETE_SCHEMA_FIX.sql:

```sql
-- 1. Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'documents', 
    'case_documents', 
    'report_documents', 
    'case_report_documents',
    'matter_updates'
)
ORDER BY table_name;

-- 2. Check documents table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'documents'
ORDER BY ordinal_position;

-- 3. Check case_documents table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'case_documents'
ORDER BY ordinal_position;

-- 4. Check report_documents table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'report_documents'
ORDER BY ordinal_position;

-- 5. Check case_report_documents table columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'case_report_documents'
ORDER BY ordinal_position;

-- 6. Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('documents', 'case_documents', 'report_documents', 'case_report_documents')
ORDER BY tablename, policyname;
```

---

## ✅ SOLUTION SUMMARY

**All issues are addressed in `COMPLETE_SCHEMA_FIX.sql`:**

1. ✅ Creates all 5 required tables
2. ✅ Adds ALL required columns with IF NOT EXISTS checks
3. ✅ Sets up RLS policies for staff and client access
4. ✅ Grants proper permissions

**After running COMPLETE_SCHEMA_FIX.sql:**
- ✅ Clients can submit cases with documents
- ✅ Staff can submit progress reports with documents
- ✅ Clients can view all their documents (intake, case files, reports)
- ✅ Staff can manage all documents
- ✅ No more missing column errors

---

## 🚀 NEXT STEPS

1. **Run** `COMPLETE_SCHEMA_FIX.sql` in Supabase SQL Editor
2. **Verify** using the checklist queries above
3. **Test** document upload and fetching on both client and internal portals
4. **Monitor** for any remaining errors

---

## 📝 NOTES

- All document queries use proper foreign key relationships
- Client visibility is controlled at multiple levels (table + RLS)
- Storage bucket is `case_documents` for all file types
- File paths follow pattern: `reports/{id}/{filename}` or `vault/{user_id}/{filename}`
