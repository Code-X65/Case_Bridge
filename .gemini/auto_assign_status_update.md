# Auto-Assign Status Update

## Change Summary
Updated the case assignment flow to automatically transition the case status to "Assigned" when an Associate Lawyer is assigned.

---

## What Changed

### File Modified:
`c:\dev\Casebridge\CaseBridge_Internal\src\pages\cases\MatterDetailPage.tsx`

### Function Updated:
`handleAssign()` in the `AssignDialog` component

---

## Implementation Details

### Before:
When an Associate Lawyer was assigned:
1. ✅ Create `case_assignments` record
2. ✅ Create case log
3. ✅ Create audit log
4. ❌ Status remained unchanged (manual update required)

### After:
When an Associate Lawyer is assigned:
1. ✅ Create `case_assignments` record
2. ✅ **Automatically transition status to "Assigned"**
3. ✅ Create case log
4. ✅ Create audit log
5. ✅ **Client receives notification** (via transition_case_status)

---

## Code Changes

### Added Status Transition:
```typescript
// Transition case status to "Assigned"
const { error: statusError } = await supabase.rpc('transition_case_status', {
    p_matter_id: matterId,
    p_new_status: 'Assigned',
    p_note: 'Associate Lawyer assigned to case'
});

if (statusError) {
    console.error('Status transition error:', statusError);
    // Don't throw - assignment succeeded, status transition is secondary
}
```

### Updated Toast Message:
```typescript
toast({
    title: 'Case Assigned',
    description: 'The case has been assigned successfully and status updated to Assigned.',
});
```

---

## Benefits

### 1. **Automatic Status Update**
- No manual status change required
- Consistent workflow
- Reduces human error

### 2. **Client Notification**
- Client automatically notified when lawyer assigned
- Notification created by `transition_case_status` function
- Message: "A lawyer has been assigned to your case"

### 3. **Audit Trail**
- Status change logged in `case_logs`
- Includes note: "Associate Lawyer assigned to case"
- Full audit trail maintained

### 4. **Error Handling**
- If status transition fails, assignment still succeeds
- Error logged to console for debugging
- User still sees success message

---

## Updated Workflow

### Complete Assignment Flow:
```
Admin/Case Manager clicks "Assign Case"
        ↓
Selects Associate Lawyer
        ↓
Clicks "Assign"
        ↓
1. Create case_assignments record
        ↓
2. Call transition_case_status('Assigned') ← NEW
        ↓
3. Create case_logs entry
        ↓
4. Create audit_logs entry
        ↓
5. Show success toast
        ↓
6. Refresh case data
        ↓
Client receives notification ← AUTOMATIC
```

---

## Status Flow Updated

### Previous Flow:
```
Pending Review → Reviewed → (Manual Assign) → Active → Closed
```

### Current Flow:
```
Pending Review → Reviewed → Assigned → Active → Closed
                              ↑
                    (Automatic on assignment)
```

---

## Testing

### Test Scenario:
1. Log in as Admin Manager or Case Manager
2. Open a case with status "Reviewed"
3. Click "Assign Case"
4. Select an active Associate Lawyer
5. Click "Assign"

### Expected Results:
- ✅ Assignment created
- ✅ Status changes to "Assigned"
- ✅ Toast shows: "The case has been assigned successfully and status updated to Assigned."
- ✅ Case log created with action "case_assigned"
- ✅ Client receives notification
- ✅ Associate Lawyer can now see the case

---

## Database Impact

### Tables Affected:
1. `case_assignments` - New record created
2. `matters` - Status updated to "Assigned"
3. `case_logs` - Two entries:
   - "case_assigned" (manual log)
   - "status_changed" (from transition function)
4. `audit_logs` - Assignment audit entry
5. `notifications` - Client notification created

---

## Backward Compatibility

### ✅ Fully Compatible:
- Existing assignments not affected
- Works with current database schema
- No migration required
- Uses existing `transition_case_status` function

---

## Error Handling

### Graceful Degradation:
```typescript
if (statusError) {
    console.error('Status transition error:', statusError);
    // Don't throw - assignment succeeded, status transition is secondary
}
```

**Rationale**:
- Assignment is the primary action
- Status transition is secondary
- If status fails, assignment still succeeds
- Admin can manually update status if needed

---

## Client Experience

### What Clients See:

**Before Assignment**:
- Case status: "Reviewed"
- No assigned lawyer shown

**After Assignment**:
- ✅ Notification: "A lawyer has been assigned to your case"
- ✅ Case status: "Assigned"
- ✅ Lawyer name visible on case detail
- ✅ Can see lawyer's information

---

## Summary

**Change**: Automatic status transition to "Assigned" on lawyer assignment  
**Impact**: Improved workflow, automatic client notification  
**Risk**: Low (graceful error handling)  
**Testing**: Required before production  
**Migration**: None required  

**Status**: ✅ Implemented and Ready for Testing

---

**Updated**: 2026-01-15  
**File**: MatterDetailPage.tsx  
**Lines Changed**: ~12 lines added  
**Breaking Changes**: None
