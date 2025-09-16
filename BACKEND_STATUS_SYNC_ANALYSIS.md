# Backend Status Synchronization Analysis

## Issue Description
There's a critical status synchronization issue between the book catalog details view and the my requests view. When a borrow request is cancelled, the book catalog still shows copies as "pending" even though the request status is "CANCELLED" in the my requests tab.

## Current Behavior
1. **Book Details Screen**: Shows copies as "Request Pending" with orange status indicators
2. **My Requests Screen**: Shows the same request as "CANCELLED" with grey status indicator
3. **Problem**: The book details page is not reflecting the actual current status of requests

## Root Cause Analysis

### Frontend Issues
1. **Local Storage Caching**: The book details page caches pending copy IDs in local storage (`pending_copy_ids_${bookId}`) and doesn't properly clear them when requests are cancelled
2. **API Filtering**: The `getBorrowRequests('pending')` call is not properly filtering out cancelled requests
3. **Status Sync Logic**: The StatusSync utility is not properly handling cancelled requests

### Backend Issues (Need Clarification)
1. **API Response Format**: Need to verify what the `/api/borrow-requests?status=pending` endpoint returns
2. **Status Values**: Need to confirm what status values are used for cancelled requests
3. **Real-time Updates**: Need to understand if there's a mechanism for real-time status updates

## Questions for Backend Team

### 1. API Endpoint Behavior
**Question**: What does the `/api/borrow-requests?status=pending` endpoint return?
- Does it return only requests with status = 'PENDING'?
- Does it include cancelled requests (status = 'CANCELLED')?
- What are the exact status values used in the database?

**Expected Response Format**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request_id",
        "bookId": "book_id", 
        "copyId": "copy_id",
        "userId": "user_id",
        "status": "PENDING", // or "CANCELLED", "APPROVED", etc.
        "dateRequested": "2025-01-14T00:00:00Z",
        "expectedReturnDate": "2025-01-16T00:00:00Z"
      }
    ]
  }
}
```

### 2. Status Values
**Question**: What are the exact status values used in the database for borrow requests?
- PENDING
- APPROVED  
- CANCELLED
- REJECTED
- COMPLETED

### 3. Request Lifecycle
**Question**: What happens when a borrow request is cancelled?
- Is the status updated to 'CANCELLED' in the database?
- Is the request soft-deleted or hard-deleted?
- Are there any triggers that update related data (like book copy status)?

### 4. Real-time Updates
**Question**: Is there a mechanism for real-time status updates?
- WebSocket connections?
- Server-sent events?
- Polling mechanism?
- Or should the frontend poll the API periodically?

### 5. Data Consistency
**Question**: How do we ensure data consistency between:
- Borrow requests table
- Book copies table  
- Borrow transactions table
- User books table

## Proposed Solution

### Frontend Changes Needed
1. **Fix API Filtering**: Ensure `getBorrowRequests('pending')` only returns actual pending requests
2. **Clear Local Cache**: Clear pending copy IDs from local storage when requests are cancelled
3. **Real-time Sync**: Implement proper status synchronization between screens
4. **Status Priority**: Ensure borrowed status takes priority over pending status

### Backend Changes Needed (if any)
1. **API Response**: Ensure the API returns only the requested status
2. **Status Updates**: Ensure cancelled requests are properly marked in the database
3. **Data Consistency**: Ensure all related tables are updated when requests are cancelled

## Test Cases

### Test Case 1: Request Cancellation
1. User creates a borrow request for a book
2. Book details page shows copy as "pending"
3. User cancels the request from my requests page
4. **Expected**: Book details page should no longer show copy as "pending"
5. **Actual**: Book details page still shows copy as "pending"

### Test Case 2: Status Synchronization
1. User has a pending request for a book
2. Librarian approves the request
3. **Expected**: Book details page should show copy as "borrowed" (not pending)
4. **Actual**: Need to verify this behavior

### Test Case 3: Multiple Requests
1. User creates multiple requests for the same book
2. User cancels one request
3. **Expected**: Only the remaining active requests should show as pending
4. **Actual**: Need to verify this behavior

## Files to Check

### Frontend Files
- `LibraryApplication/app/book-catalog/details.jsx` - Book details page logic
- `LibraryApplication/app/borrowing/my-requests.jsx` - My requests page logic  
- `LibraryApplication/services/ApiService.js` - API service methods
- `LibraryApplication/utils/StatusSync.js` - Status synchronization utility

### Backend Files
- `kcmi-library-system/src/app/api/borrow-requests/route.ts` - Borrow requests API endpoint
- Database schema for borrow requests table
- Any triggers or stored procedures for status updates

## Priority
**HIGH** - This affects user experience and data consistency across the application.

## Next Steps
1. Backend team to answer the questions above
2. Frontend team to implement fixes based on backend responses
3. Test the complete flow end-to-end
4. Deploy fixes to production
