# 📚 Copy System Requirements for Backend

## 🚨 **CRITICAL ISSUE: COPY_NOT_FOUND Error**

The mobile app is experiencing `COPY_NOT_FOUND` errors when trying to borrow books. This document outlines the required backend implementation to fix this issue.

---

## 🔍 **Root Cause Analysis**

### **Current Problem**
- Mobile app generates copy IDs like `copy_book-math-senior-006_1`
- Backend expects copy IDs in a different format
- No API endpoint exists to get actual book copies
- Copy IDs don't exist in the database

### **Error Details**
```json
{
  "code": "COPY_NOT_FOUND",
  "message": "Book copy not found or does not belong to this book"
}
```

---

## 🛠️ **Required Backend Implementation**

### **1. Book Copies API Endpoint**

**Endpoint:** `GET /api/books/{bookId}/copies`

**Purpose:** Get all available copies for a specific book

**Request:**
```http
GET /api/books/book-math-senior-006/copies
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "copies": [
      {
        "id": "copy_123",
        "bookId": "book-math-senior-006",
        "copyNumber": "Copy 1",
        "status": "available",
        "location": "Library",
        "shelfLocation": "Fi/senH",
        "condition": "GOOD",
        "isbn": "978-1234567890",
        "purchaseDate": "2023-01-15T00:00:00.000Z",
        "lastMaintenance": "2023-12-01T00:00:00.000Z"
      },
      {
        "id": "copy_124",
        "bookId": "book-math-senior-006",
        "copyNumber": "Copy 2",
        "status": "available",
        "location": "Library",
        "shelfLocation": "Fi/senH",
        "condition": "EXCELLENT",
        "isbn": "978-1234567890",
        "purchaseDate": "2023-01-15T00:00:00.000Z",
        "lastMaintenance": "2023-11-15T00:00:00.000Z"
      }
    ]
  }
}
```

### **2. Database Schema for Book Copies**

**Table: `book_copies`**
```sql
CREATE TABLE book_copies (
  id VARCHAR(50) PRIMARY KEY,
  book_id VARCHAR(50) NOT NULL,
  copy_number VARCHAR(20) NOT NULL,
  status ENUM('available', 'borrowed', 'reserved', 'maintenance') DEFAULT 'available',
  location VARCHAR(100) DEFAULT 'Library',
  shelf_location VARCHAR(50),
  condition ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR') DEFAULT 'GOOD',
  isbn VARCHAR(20),
  purchase_date DATE,
  last_maintenance DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  INDEX idx_book_id (book_id),
  INDEX idx_status (status),
  INDEX idx_shelf_location (shelf_location)
);
```

### **3. Copy ID Format**

**Required Format:** `copy_{unique_number}`

**Examples:**
- `copy_123`
- `copy_124`
- `copy_125`

**NOT:**
- `copy_book-math-senior-006_1` ❌
- `book-math-senior-006_copy_1` ❌

### **4. Sample Data for Testing**

```sql
-- Insert sample copies for testing
INSERT INTO book_copies (id, book_id, copy_number, status, location, shelf_location, condition) VALUES
('copy_123', 'book-math-senior-006', 'Copy 1', 'available', 'Library', 'Fi/senH', 'GOOD'),
('copy_124', 'book-math-senior-006', 'Copy 2', 'available', 'Library', 'Fi/senH', 'EXCELLENT'),
('copy_125', 'book-college-english-007', 'Copy 1', 'available', 'Library', 'Fi-college', 'GOOD'),
('copy_126', 'book-college-english-007', 'Copy 2', 'available', 'Library', 'Fi-college', 'GOOD'),
('copy_127', 'book-college-english-007', 'Copy 3', 'borrowed', 'Library', 'Fi-college', 'GOOD');
```

---

## 🔧 **Backend API Implementation**

### **1. Get Book Copies Controller**

```javascript
// GET /api/books/:bookId/copies
async function getBookCopies(req, res) {
  try {
    const { bookId } = req.params;
    
    // Validate book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'BOOK_NOT_FOUND',
          message: 'Book not found'
        }
      });
    }
    
    // Get available copies
    const copies = await BookCopy.find({
      bookId: bookId,
      status: 'available'
    });
    
    res.json({
      success: true,
      data: {
        copies: copies
      }
    });
  } catch (error) {
    console.error('Error fetching book copies:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch book copies'
      }
    });
  }
}
```

### **2. Enhanced Borrow Request Validation**

```javascript
// POST /api/mobile/users/:userId/books/:bookId/borrow-request
async function createBorrowRequest(req, res) {
  try {
    const { userId, bookId } = req.params;
    const { copyId, expectedReturnDate, initialCondition, conditionNotes, requestNotes } = req.body;
    
    // Validate copy exists and belongs to the book
    const copy = await BookCopy.findOne({
      id: copyId,
      bookId: bookId,
      status: 'available'
    });
    
    if (!copy) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COPY_NOT_FOUND',
          message: 'Book copy not found or does not belong to this book'
        }
      });
    }
    
    // Check borrowing limits
    const userBorrowedCount = await BorrowRequest.countDocuments({
      userId: userId,
      status: { $in: ['pending', 'approved'] }
    });
    
    const user = await User.findById(userId);
    const maxBooks = user.role === 'teacher' ? 999 : 3; // Teachers unlimited, students 3
    
    if (userBorrowedCount >= maxBooks) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BORROW_LIMIT',
          message: `Cannot request to borrow: Maximum borrowing limit reached (${userBorrowedCount}/${maxBooks} books)`
        }
      });
    }
    
    // Create borrow request
    const borrowRequest = new BorrowRequest({
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: userId,
      bookId: bookId,
      copyId: copyId,
      expectedReturnDate: new Date(expectedReturnDate),
      initialCondition: initialCondition || 'GOOD',
      conditionNotes: conditionNotes,
      requestNotes: requestNotes,
      status: 'pending',
      createdAt: new Date()
    });
    
    await borrowRequest.save();
    
    res.json({
      success: true,
      data: {
        requestId: borrowRequest.id,
        status: 'pending',
        expectedReturnDate: borrowRequest.expectedReturnDate,
        createdAt: borrowRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating borrow request:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create borrow request'
      }
    });
  }
}
```

---

## 🧪 **Testing Instructions**

### **1. Test Book Copies API**

```bash
# Test getting copies for a book
curl -X GET "https://kcmi-library-system.vercel.app/api/books/book-math-senior-006/copies" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "copies": [
      {
        "id": "copy_123",
        "bookId": "book-math-senior-006",
        "copyNumber": "Copy 1",
        "status": "available",
        "location": "Library",
        "shelfLocation": "Fi/senH",
        "condition": "GOOD"
      }
    ]
  }
}
```

### **2. Test Borrow Request with Real Copy ID**

```bash
# Test borrow request with real copy ID
curl -X POST "https://kcmi-library-system.vercel.app/api/mobile/users/USER_ID/books/book-math-senior-006/borrow-request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "copyId": "copy_123",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "initialCondition": "GOOD",
    "conditionNotes": "Book looks in good condition",
    "requestNotes": "Need this book for research"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "requestId": "req_1234567890_abc123",
    "status": "pending",
    "expectedReturnDate": "2024-01-15T00:00:00.000Z",
    "createdAt": "2024-01-12T10:00:00.000Z"
  }
}
```

---

## 📱 **Mobile App Integration**

### **1. Updated Copy Loading**

The mobile app will now:
1. Call `GET /api/books/{bookId}/copies` to get real copies
2. Display actual copy information from the database
3. Use real copy IDs for borrow requests

### **2. Error Handling**

The mobile app will handle these error scenarios:
- `COPY_NOT_FOUND`: Copy doesn't exist or is not available
- `BORROW_LIMIT`: User has reached borrowing limit
- `BOOK_NOT_FOUND`: Book doesn't exist
- `INTERNAL_ERROR`: Server error

---

## 🚀 **Implementation Priority**

### **Phase 1: Critical (Immediate)**
1. ✅ Create `book_copies` table
2. ✅ Insert sample copy data
3. ✅ Implement `GET /api/books/{bookId}/copies` endpoint
4. ✅ Update borrow request validation to check copy existence

### **Phase 2: Enhancement (Next)**
1. Add copy management endpoints (create, update, delete)
2. Add copy status tracking (maintenance, damaged, etc.)
3. Add copy condition assessment workflow
4. Add copy location tracking

---

## 📞 **Support**

### **If Issues Persist:**

1. **Check Copy IDs**: Ensure copy IDs exist in the database
2. **Verify API Endpoint**: Test the copies API endpoint
3. **Check Database**: Ensure book_copies table has data
4. **Test Validation**: Verify copy validation logic

### **Debug Commands:**

```sql
-- Check if copies exist
SELECT * FROM book_copies WHERE book_id = 'book-math-senior-006';

-- Check copy status
SELECT id, status, condition FROM book_copies WHERE status = 'available';

-- Check borrow requests
SELECT * FROM borrow_requests WHERE copy_id = 'copy_123';
```

---

**This implementation will resolve the `COPY_NOT_FOUND` error and provide a proper copy management system for the library application.**
