# 🔧 Backend Requirements: Copy-Specific Request Tracking

## 📋 **Issue Summary**

The mobile app needs to track pending borrow requests by **copy ID** instead of **book ID** to show individual copy status correctly. Currently, when a user requests one copy of a book, all copies show as "Request Pending" because the mobile app is tracking by book ID.

---

## 🎯 **Required Backend API Changes**

### **1. Borrow Request API Response Structure**

**Current Issue**: The `GET /api/mobile/users/{userId}/borrow-requests` API needs to return `copyId` in the response.

**Required Response Structure**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "req_123",
        "bookId": "book-college-english-007",
        "copyId": "copy-college-english-001",  // ← REQUIRED: Specific copy ID
        "status": "pending",
        "expectedReturnDate": "2024-01-15T00:00:00.000Z",
        "requestNotes": "Need for assignment",
        "createdAt": "2024-01-12T10:00:00.000Z",
        "book": {
          "id": "book-college-english-007",
          "title": "College English: Communication Skills",
          "author": "Cruz, Juan P [Et.Al.]"
        },
        "copy": {
          "id": "copy-college-english-001",
          "copyNumber": 1,
          "condition": "GOOD",
          "location": "Shelf College-1"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalRequests": 1
    }
  }
}
```

### **2. Create Borrow Request API Response**

**Current Issue**: The `POST /api/mobile/users/{userId}/books/{bookId}/borrow-request` API needs to return `copyId` in the success response.

**Required Response Structure**:
```json
{
  "success": true,
  "data": {
    "id": "req_123",
    "bookId": "book-college-english-007",
    "copyId": "copy-college-english-001",  // ← REQUIRED: Return the copy ID
    "status": "pending",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "requestNotes": "Need for assignment",
    "createdAt": "2024-01-12T10:00:00.000Z"
  }
}
```

---

## 🔍 **Database Schema Requirements**

### **Borrow Request Table Structure**
```sql
CREATE TABLE borrow_requests (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  book_id VARCHAR(255) NOT NULL,
  copy_id VARCHAR(255) NOT NULL,  -- ← REQUIRED: Reference to specific copy
  status ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  expected_return_date DATETIME NOT NULL,
  request_notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (copy_id) REFERENCES book_copies(id),
  
  -- Prevent duplicate requests for the same copy
  UNIQUE KEY unique_user_copy_request (user_id, copy_id, status)
);
```

### **Book Copies Table Structure**
```sql
CREATE TABLE book_copies (
  id VARCHAR(255) PRIMARY KEY,
  book_id VARCHAR(255) NOT NULL,
  copy_number INT NOT NULL,
  condition ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') DEFAULT 'GOOD',
  status ENUM('AVAILABLE', 'BORROWED', 'RESERVED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
  location VARCHAR(255),
  shelf_location VARCHAR(255),
  date_acquired DATETIME,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (book_id) REFERENCES books(id),
  
  -- Ensure unique copy numbers per book
  UNIQUE KEY unique_book_copy (book_id, copy_number)
);
```

---

## 🛠️ **Backend Implementation Requirements**

### **1. Update Borrow Request Creation**
```typescript
// POST /api/mobile/users/{userId}/books/{bookId}/borrow-request
export async function POST(request: NextRequest, { params }: { params: { userId: string, bookId: string } }) {
  try {
    const { copyId, expectedReturnDate, requestNotes } = await request.json();
    
    // Validate that the copy exists and is available
    const copy = await prisma.bookCopy.findFirst({
      where: {
        id: copyId,
        bookId: params.bookId,
        status: 'AVAILABLE'
      }
    });
    
    if (!copy) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'COPY_NOT_FOUND',
          message: 'The specified copy is not available'
        }
      }, { status: 404 });
    }
    
    // Check for existing pending request for this copy
    const existingRequest = await prisma.borrowRequest.findFirst({
      where: {
        userId: params.userId,
        copyId: copyId,
        status: 'pending'
      }
    });
    
    if (existingRequest) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'DUPLICATE_REQUEST',
          message: 'You have already submitted a request for this copy'
        }
      }, { status: 400 });
    }
    
    // Create the borrow request
    const borrowRequest = await prisma.borrowRequest.create({
      data: {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: params.userId,
        bookId: params.bookId,
        copyId: copyId,  // ← Store the specific copy ID
        expectedReturnDate: new Date(expectedReturnDate),
        requestNotes: requestNotes || null,
        status: 'pending'
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        id: borrowRequest.id,
        bookId: borrowRequest.bookId,
        copyId: borrowRequest.copyId,  // ← Return the copy ID
        status: borrowRequest.status,
        expectedReturnDate: borrowRequest.expectedReturnDate,
        requestNotes: borrowRequest.requestNotes,
        createdAt: borrowRequest.createdAt
      }
    });
    
  } catch (error) {
    console.error('Error creating borrow request:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'REQUEST_CREATION_ERROR',
        message: 'Failed to create borrow request'
      }
    }, { status: 500 });
  }
}
```

### **2. Update Borrow Request Retrieval**
```typescript
// GET /api/mobile/users/{userId}/borrow-requests
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    
    const whereClause: any = {
      userId: params.userId
    };
    
    if (status !== 'all') {
      whereClause.status = status;
    }
    
    const requests = await prisma.borrowRequest.findMany({
      where: whereClause,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            isbn: true
          }
        },
        copy: {
          select: {
            id: true,
            copyNumber: true,
            condition: true,
            location: true,
            shelfLocation: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        requests: requests.map(request => ({
          id: request.id,
          bookId: request.bookId,
          copyId: request.copyId,  // ← Include copy ID
          status: request.status,
          expectedReturnDate: request.expectedReturnDate,
          requestNotes: request.requestNotes,
          createdAt: request.createdAt,
          book: request.book,
          copy: request.copy
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching borrow requests:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'REQUESTS_FETCH_ERROR',
        message: 'Failed to fetch borrow requests'
      }
    }, { status: 500 });
  }
}
```

---

## 🧪 **Testing Requirements**

### **Test 1: Create Borrow Request with Copy ID**
```bash
curl -X POST "https://kcmi-library-system.vercel.app/api/mobile/users/USER_ID/books/book-college-english-007/borrow-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "copyId": "copy-college-english-001",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "requestNotes": "Test request for copy 1"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "req_123",
    "bookId": "book-college-english-007",
    "copyId": "copy-college-english-001",
    "status": "pending",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "requestNotes": "Test request for copy 1",
    "createdAt": "2024-01-12T10:00:00.000Z"
  }
}
```

### **Test 2: Get Borrow Requests with Copy IDs**
```bash
curl -X GET "https://kcmi-library-system.vercel.app/api/mobile/users/USER_ID/borrow-requests?status=pending" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "req_123",
        "bookId": "book-college-english-007",
        "copyId": "copy-college-english-001",
        "status": "pending",
        "expectedReturnDate": "2024-01-15T00:00:00.000Z",
        "requestNotes": "Test request for copy 1",
        "createdAt": "2024-01-12T10:00:00.000Z",
        "book": {
          "id": "book-college-english-007",
          "title": "College English: Communication Skills",
          "author": "Cruz, Juan P [Et.Al.]"
        },
        "copy": {
          "id": "copy-college-english-001",
          "copyNumber": 1,
          "condition": "GOOD",
          "location": "Shelf College-1"
        }
      }
    ]
  }
}
```

### **Test 3: Duplicate Request Prevention**
```bash
# Try to create another request for the same copy
curl -X POST "https://kcmi-library-system.vercel.app/api/mobile/users/USER_ID/books/book-college-english-007/borrow-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "copyId": "copy-college-english-001",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "requestNotes": "Another request for same copy"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "You have already submitted a request for this copy"
  }
}
```

---

## 🎯 **Expected Results After Implementation**

### **Before Fix (❌ Current Issue)**:
- User requests Copy 1 → All copies show "Request Pending"
- User can't distinguish which copy they requested
- My Requests screen may not show recent requests properly

### **After Fix (✅ Expected Result)**:
- User requests Copy 1 → Only Copy 1 shows "Request Pending"
- Copy 2 and Copy 3 show "Request to Borrow"
- My Requests screen shows the specific copy that was requested
- Proper error handling for duplicate requests on same copy

---

## ⚡ **Priority: HIGH**

This fix is required to enable proper copy-specific request tracking and prevent user confusion about which copies they have requested.

---

## 📞 **Next Steps**

1. **Backend team**: Update borrow request APIs to include `copyId` in responses
2. **Database**: Ensure `copy_id` is stored and returned in borrow requests
3. **Test**: Verify that copy-specific tracking works correctly
4. **Mobile app**: Will automatically work correctly once backend returns `copyId`

---

**Status**: 🚨 **URGENT - Backend team action required**

**Issue**: Copy-specific request tracking not working
**Solution**: Include `copyId` in borrow request API responses
