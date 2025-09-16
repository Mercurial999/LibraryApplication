# Backend API Requirements for Cancel Borrow Request

## Issue
The mobile app needs to be able to cancel pending borrow requests, but the current deployed backend doesn't have the DELETE method for `/api/borrow-requests`.

## Current Status
- ✅ **Frontend**: Ready to call the API
- ❌ **Backend**: DELETE method not deployed
- ❌ **API Endpoint**: Returns 405 Method Not Allowed

## Required API Endpoint

### DELETE /api/borrow-requests
**Purpose**: Cancel a pending borrow request

**Query Parameters**:
- `requestId` (required): The ID of the borrow request to cancel
- `userId` (required): The ID of the user making the request

**Example Request**:
```
DELETE /api/borrow-requests?requestId=borrow_req_1757848111442_oxj51e103&userId=user_1757136413169_i5j8zi
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Borrow request cancelled successfully",
  "requestId": "borrow_req_1757848111442_oxj51e103",
  "status": "CANCELLED",
  "type": "request"
}
```

**Error Response**:
```json
{
  "error": "Borrow request not found or not pending"
}
```

## Backend Implementation Required

### File: `kcmi-library-system/src/app/api/borrow-requests/route.ts`

Add the following DELETE method:

```typescript
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get('requestId');
    const userId = searchParams.get('userId');

    if (!requestId || !userId) {
      return NextResponse.json(
        { error: 'Request ID and User ID are required' },
        { status: 400 }
      );
    }

    // Find the borrow request
    const borrowRequest = await prisma.borrowrequest.findFirst({
      where: {
        id: requestId,
        userId: userId,
        status: 'PENDING',
      },
    });

    if (!borrowRequest) {
      return NextResponse.json(
        { error: 'Borrow request not found or not pending' },
        { status: 404 }
      );
    }

    // Update request status to CANCELLED
    await prisma.borrowrequest.update({
      where: { id: requestId },
      data: {
        status: 'CANCELLED',
        processedDate: new Date(),
        rejectionReason: 'Cancelled by user',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Borrow request cancelled successfully',
      requestId: requestId,
      status: 'CANCELLED',
      type: 'request'
    });

  } catch (error) {
    console.error('Failed to cancel borrow request:', error);
    return NextResponse.json(
      { error: 'Failed to cancel borrow request' },
      { status: 500 }
    );
  }
}
```

## Database Changes Required

### Table: `borrowrequest`
- Update `status` field to `'CANCELLED'`
- Set `processedDate` to current timestamp
- Set `rejectionReason` to `'Cancelled by user'`

## Testing

### Test Cases
1. **Valid Request**: Cancel a pending borrow request
2. **Invalid Request ID**: Try to cancel non-existent request
3. **Wrong User**: Try to cancel another user's request
4. **Already Processed**: Try to cancel already approved/rejected request
5. **Missing Parameters**: Try without requestId or userId

### Test Commands
```bash
# Valid cancellation
curl -X DELETE "https://kcmi-library-system.vercel.app/api/borrow-requests?requestId=borrow_req_1757848111442_oxj51e103&userId=user_1757136413169_i5j8zi"

# Invalid request ID
curl -X DELETE "https://kcmi-library-system.vercel.app/api/borrow-requests?requestId=invalid_id&userId=user_1757136413169_i5j8zi"

# Missing parameters
curl -X DELETE "https://kcmi-library-system.vercel.app/api/borrow-requests?requestId=borrow_req_1757848111442_oxj51e103"
```

## Frontend Integration

The frontend is already ready and will:
1. Show "Cancel Request" button for PENDING requests
2. Call the DELETE API when user confirms
3. Update the UI immediately after successful cancellation
4. Show appropriate error messages if cancellation fails

## Priority
**HIGH** - This is blocking the mobile app functionality for cancelling borrow requests.

## Deployment
After implementing the DELETE method, deploy the changes to Vercel so the mobile app can use the functionality.

---
**Note**: The frontend code is complete and ready. Only the backend API implementation and deployment is needed.
