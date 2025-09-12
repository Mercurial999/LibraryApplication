# Backend API Consistency Fix for Pending Borrow Requests

## Problem Identified

The frontend is not properly tracking pending borrow requests due to API inconsistency:

1. **Create Request API** (`POST /api/mobile/users/[id]/books/[bookId]/borrow-request`):
   - ✅ Correctly validates `copyId`
   - ✅ Returns proper error for duplicate requests
   - ✅ Works as expected

2. **List Pending Requests API** (`GET /api/borrow-requests`):
   - ❌ **MISSING `copyId` field** in response
   - ❌ Returns `copyId: undefined` 
   - ❌ Frontend cannot determine which specific copy is pending

## Current API Response Issues

### What the server returns:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "borrow_req_1757149393580_2smi4a4nr",
        "bookId": "book-college-english-007",
        "copyId": undefined,  // ❌ MISSING!
        "status": "PENDING",
        "userId": "user_1757136413169_i5j8zi",
        // ... other fields
      }
    ]
  }
}
```

### What the frontend needs:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "borrow_req_1757149393580_2smi4a4nr",
        "bookId": "book-college-english-007",
        "copyId": "copy-college-english-001",  // ✅ REQUIRED!
        "status": "PENDING",
        "userId": "user_1757136413169_i5j8zi",
        // ... other fields
      }
    ]
  }
}
```

## Required Backend Changes

### 1. Fix `/api/borrow-requests` Endpoint

**File:** `src/app/api/borrow-requests/route.ts`

**Current Issue:** The endpoint doesn't include `copyId` in the response.

**Required Fix:** Include `copyId` in the response by joining with the `book_copies` table.

**Example Fix:**
```typescript
// In the GET handler for /api/borrow-requests
const requests = await prisma.borrowRequest.findMany({
  where: {
    status: 'PENDING',
    // ... other filters
  },
  include: {
    bookCopy: {
      select: {
        id: true,  // This should be the copyId
        copyNumber: true,
        // ... other copy fields
      }
    },
    // ... other includes
  }
});

// Transform the response to include copyId
const transformedRequests = requests.map(request => ({
  ...request,
  copyId: request.bookCopy?.id,  // Map bookCopy.id to copyId
  // ... other fields
}));
```

### 2. Alternative: Add `copyId` Field to Database

If the `borrow_requests` table doesn't have a direct `copyId` field, add it:

**Migration:**
```sql
ALTER TABLE borrow_requests 
ADD COLUMN copyId VARCHAR(255) AFTER bookId;

-- Update existing records
UPDATE borrow_requests br
JOIN book_copies bc ON br.bookCopyId = bc.id
SET br.copyId = bc.id;
```

### 3. Ensure Mobile Create Endpoint Returns `copyId`

**File:** `src/app/api/mobile/users/[id]/books/[bookId]/borrow-request/route.ts`

**Verify:** The response includes `copyId`:

```typescript
return NextResponse.json({
  success: true,
  data: {
    ...requestData,
    copyId: requestData.copyId,  // Ensure this is included
    id: newRequest.id,
    status: 'PENDING'
  }
});
```

## Frontend Workaround (Temporary)

Until the backend is fixed, the frontend will use client-side state management:

1. **Track pending copy IDs locally** using `AsyncStorage`
2. **Add to pending set** when request is successful
3. **Remove from pending set** when request is processed/approved/rejected
4. **Persist across app sessions**

## Testing the Fix

### Backend Testing:
1. **Create a borrow request** via mobile API
2. **Check `/api/borrow-requests`** response includes `copyId`
3. **Verify `copyId` matches** the requested copy

### Frontend Testing:
1. **Request Copy 1** → Should show as pending
2. **Copy 2 and 3** → Should remain available
3. **Try requesting Copy 1 again** → Should show duplicate error
4. **Restart app** → Copy 1 should still show as pending

## Priority

**HIGH PRIORITY** - This affects core functionality:
- Users can't see which specific copy is pending
- Users can request the same copy multiple times
- Inconsistent user experience

## Files to Update

1. `src/app/api/borrow-requests/route.ts` - Add copyId to response
2. `src/app/api/mobile/users/[id]/books/[bookId]/borrow-request/route.ts` - Verify copyId in response
3. Database migration (if needed) - Add copyId field

## Expected Outcome

After the fix:
- ✅ `/api/borrow-requests` returns `copyId` for each request
- ✅ Frontend can properly track which copy is pending
- ✅ Users see accurate pending status
- ✅ Duplicate requests are prevented in UI
- ✅ Consistent behavior across all APIs
