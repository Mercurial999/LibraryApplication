# 🚨 URGENT: Backend API Issues - Mobile App Cannot Function

## 📋 **Critical Issues Preventing Mobile App from Working**

### 1. **CORS Configuration Issue** ⚠️ **HIGH PRIORITY**

**Problem**: The mobile app running on `localhost:8081` cannot access the API at `https://kcmi-library-system.vercel.app` due to CORS policy blocking.

**Error Message**:
```
Access to fetch at 'https://kcmi-library-system.vercel.app/api/books?limit=1000&filterBy=title' 
from origin 'http://localhost:8081' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Required Fix**:
```javascript
// Add to your CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:8081',    // Expo development server
    'http://localhost:19006',   // Expo web development
    'http://localhost:3000',    // Alternative development port
    'https://your-production-domain.com'  // Production domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
```

### 2. **Books API Endpoint Issues** ⚠️ **HIGH PRIORITY**

**Current Problem**: The `/api/books` endpoint is not responding properly or returning HTML instead of JSON.

**Required API Endpoint**:
```javascript
GET /api/books
Query Parameters:
- search: string (optional) - Search term
- filterBy: string (optional) - Filter field (title, author, subject, ddc)
- limit: number (optional) - Number of results (default: 100)
- page: number (optional) - Page number (default: 1)
- shelfLocation: string (optional) - Filter by shelf location
- courseProgram: string (optional) - Filter by course program

Expected Response:
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "book-college-english-007",
        "title": "College English",
        "author": "John Smith",
        "subject": "English",
        "ddc": "420.7",
        "shelfLocationPrefix": "Fi-college",  // Updated codes
        "courseProgram": "BEED",
        "availableCopies": 2,
        "totalCopies": 5,
        "isbn": "978-1234567890",
        "publisher": "ABC Publishing",
        "year": 2023,
        "description": "Comprehensive English textbook"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalBooks": 50,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 3. **Borrow Request API Issues** ⚠️ **MEDIUM PRIORITY**

**Current Problem**: Borrow request API is working but returning borrowing limit errors.

**Required API Endpoint**:
```javascript
POST /api/mobile/users/{userId}/books/{bookId}/borrow-request

Request Body:
{
  "copyId": "copy_123",  // Required: Specific copy to borrow
  "expectedReturnDate": "2024-01-15T00:00:00.000Z",
  "requestNotes": "Optional notes"
}

Expected Response (Success):
{
  "success": true,
  "data": {
    "requestId": "req_123",
    "status": "pending",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "createdAt": "2024-01-12T10:00:00.000Z"
  }
}

Expected Response (Borrowing Limit Error):
{
  "success": false,
  "error": {
    "code": "BORROW_LIMIT",
    "message": "Cannot request to borrow: Maximum borrowing limit reached"
  }
}
```

### 4. **Shelf Location Codes Update** ⚠️ **MEDIUM PRIORITY**

**Required Update**: Update shelf location codes to match the new system:

```javascript
// OLD CODES (remove these):
"Fi", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"

// NEW CODES (use these):
"Fi-college"    // College collection
"Fi/senH"       // Senior High School collection  
"Fi/HS"         // High School collection
"Fi/E"          // Elementary collection
"Fi/K"          // Kindergarten collection
```

### 5. **User Borrowing Limits** ⚠️ **MEDIUM PRIORITY**

**Required Implementation**:
```javascript
// Student Limits
const STUDENT_LIMITS = {
  maxBooks: 3,
  maxDays: 3
};

// Teacher Limits  
const TEACHER_LIMITS = {
  maxBooks: -1,  // Unlimited
  maxDays: -1    // Until end of semester
};

// Check user role and apply appropriate limits
function checkBorrowingLimits(userId) {
  const user = getUserById(userId);
  const limits = user.role === 'teacher' ? TEACHER_LIMITS : STUDENT_LIMITS;
  
  // Check current borrowed books count
  const currentBorrowed = getCurrentBorrowedBooksCount(userId);
  
  if (limits.maxBooks > 0 && currentBorrowed >= limits.maxBooks) {
    return {
      allowed: false,
      reason: "Maximum borrowing limit reached"
    };
  }
  
  return { allowed: true };
}
```

### 6. **Reservation System** ⚠️ **MEDIUM PRIORITY**

**Purpose**: Allow users to reserve books that are currently borrowed by others.

**Required API Endpoints**:

```javascript
// Get borrowed books (for reservation)
GET /api/books?availability=borrowed
Response: {
  "success": true,
  "data": {
    "books": [
      {
        "id": "book_123",
        "title": "Book Title",
        "author": "Author Name",
        "availableCopies": 0,  // All copies borrowed
        "totalCopies": 3,
        "borrowedCopies": 3    // All copies are borrowed
      }
    ]
  }
}

// Create reservation
POST /api/mobile/users/{userId}/books/{bookId}/reserve
Request Body: {
  "expectedReturnDate": "2024-01-15T00:00:00.000Z"
}
Response: {
  "success": true,
  "data": {
    "reservationId": "res_123",
    "status": "pending",
    "bookId": "book_123",
    "userId": "user_456",
    "createdAt": "2024-01-12T10:00:00.000Z",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z"
  }
}

// Get user reservations
GET /api/mobile/users/{userId}/reservations?status=available
Response: {
  "success": true,
  "data": {
    "reservations": [
      {
        "id": "res_123",
        "book": {
          "id": "book_123",
          "title": "Book Title",
          "author": "Author Name"
        },
        "status": "available",  // Book is now available
        "createdAt": "2024-01-12T10:00:00.000Z",
        "availableUntil": "2024-01-15T10:00:00.000Z"  // 3 days to borrow
      }
    ]
  }
}
```

**Reservation Logic**:
```javascript
// When a book is returned, check for pending reservations
function onBookReturned(bookId, copyId) {
  // Get pending reservations for this book
  const reservations = getPendingReservations(bookId);
  
  if (reservations.length > 0) {
    // Notify the first person in queue
    const firstReservation = reservations[0];
    notifyUser(firstReservation.userId, {
      type: 'BOOK_AVAILABLE',
      bookId: bookId,
      reservationId: firstReservation.id,
      availableUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days
    });
    
    // Update reservation status
    updateReservationStatus(firstReservation.id, 'available');
  }
}
```

### 7. **Error Handling System** ⚠️ **HIGH PRIORITY**

**Purpose**: Provide user-friendly error messages for system/logic errors while hiding technical code errors.

**Required Error Types**:
```javascript
// System/Logic Errors (SHOW to users)
const USER_FRIENDLY_ERRORS = {
  BORROW_LIMIT: "You have reached your maximum borrowing limit. Please return some books before requesting new ones.",
  BOOK_UNAVAILABLE: "This book is no longer available for borrowing.",
  USER_NOT_FOUND: "User account not found. Please log in again.",
  INVALID_COPY: "The selected copy is no longer available.",
  ALREADY_BORROWED: "You have already borrowed this book.",
  ALREADY_RESERVED: "You have already reserved this book.",
  ACCOUNT_SUSPENDED: "Your account is currently suspended. Please contact the library.",
  OVERDUE_BOOKS: "You have overdue books. Please return them before borrowing new ones.",
  NETWORK_ERROR: "Network connection issue. Please check your internet connection and try again.",
  AUTHENTICATION_ERROR: "Authentication failed. Please log in again."
};

// Code Errors (HIDE from users - show generic message)
const CODE_ERRORS = [
  "TypeError",
  "ReferenceError", 
  "SyntaxError",
  "Internal Server Error",
  "Database Connection Error",
  "API Gateway Error"
];
```

**Error Response Format**:
```javascript
// Success Response
{
  "success": true,
  "data": { ... }
}

// User-Friendly Error Response
{
  "success": false,
  "error": {
    "code": "BORROW_LIMIT",
    "message": "You have reached your maximum borrowing limit. Please return some books before requesting new ones.",
    "type": "USER_ERROR"  // or "SYSTEM_ERROR"
  }
}

// Code Error Response (for debugging)
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Database connection failed",
    "type": "CODE_ERROR",
    "debug": "Connection timeout after 30 seconds"  // Only in development
  }
}
```

**Error Handling Logic**:
```javascript
function handleApiError(error) {
  const errorType = error.type || 'UNKNOWN';
  
  if (errorType === 'USER_ERROR') {
    // Show user-friendly message
    return {
      showToUser: true,
      message: error.message,
      title: 'Request Failed'
    };
  } else if (errorType === 'SYSTEM_ERROR') {
    // Show system error message
    return {
      showToUser: true,
      message: error.message,
      title: 'System Error'
    };
  } else {
    // Hide code errors from users
    console.error('Code error (not showing to user):', error);
    return {
      showToUser: false,
      message: 'Something went wrong. Please try again later.',
      title: 'Error'
    };
  }
}
```

## 🔧 **Immediate Action Items**

### **Priority 1 (Fix Immediately)**:
1. **Configure CORS** to allow `localhost:8081` and `localhost:19006`
2. **Fix `/api/books` endpoint** to return proper JSON response
3. **Test API endpoints** with the mobile app

### **Priority 2 (Fix Within 24 Hours)**:
1. **Update shelf location codes** in database and API responses
2. **Implement proper borrowing limits** based on user roles
3. **Add better error handling** for borrow requests

### **Priority 3 (Fix Within 48 Hours)**:
1. **Add API endpoint for available copies** of books
2. **Implement book details endpoint** with copy information
3. **Add search and filter functionality** to books API
4. **Implement reservation notification system** for when books become available

## 🧪 **Testing Instructions**

### **Test CORS Fix**:
```bash
# Test from browser console on localhost:8081
fetch('https://kcmi-library-system.vercel.app/api/books?limit=1')
  .then(response => response.json())
  .then(data => console.log('CORS Test Success:', data))
  .catch(error => console.error('CORS Test Failed:', error));
```

### **Test Books API**:
```bash
curl -X GET "https://kcmi-library-system.vercel.app/api/books?limit=5" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### **Test Borrow Request API**:
```bash
curl -X POST "https://kcmi-library-system.vercel.app/api/mobile/users/USER_ID/books/BOOK_ID/borrow-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "copyId": "copy_123",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "requestNotes": "Test request"
  }'
```

### **Test Reservation API**:
```bash
# Get borrowed books (for reservation)
curl -X GET "https://kcmi-library-system.vercel.app/api/books?availability=borrowed" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create reservation
curl -X POST "https://kcmi-library-system.vercel.app/api/mobile/users/USER_ID/books/BOOK_ID/reserve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "expectedReturnDate": "2024-01-15T00:00:00.000Z"
  }'
```

## 📱 **Mobile App Status**

**Current State**: 
- ❌ Cannot search books (CORS error)
- ❌ Cannot filter books (CORS error)  
- ❌ Cannot request to borrow (API errors)
- ❌ Modal positioning issues on web

**After Backend Fixes**:
- ✅ Search and filter will work
- ✅ Borrow requests will work
- ✅ All functionality will be restored

## 🚀 **Expected Timeline**

- **CORS Fix**: 30 minutes
- **Books API Fix**: 1-2 hours
- **Borrow Request Fix**: 2-3 hours
- **Full Testing**: 1 hour

**Total Estimated Time**: 4-6 hours

---

**Contact**: Please notify the mobile development team once these fixes are deployed so we can test the integration.

**Note**: The mobile app is ready and waiting for these backend fixes. All frontend code is complete and functional.
