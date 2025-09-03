# 📚 Book Copy Availability Implementation Guide

## 🎯 **Overview**

This guide explains how to implement proper book copy availability logic in your backend. The current implementation incorrectly treats availability as a single property for the entire book, but it should be:

- **Book Level**: Total copies, available copies count, aggregated information
- **Copy Level**: Individual copy status (available, borrowed, reserved, damaged, lost, etc.)

## 🔧 **Current Problem**

### ❌ **Wrong Implementation:**
```json
{
  "id": 1,
  "title": "Mathematics 101",
  "author": "John Doe",
  "availability": "available",  // ❌ WRONG: Single status for entire book
  "totalCopies": 3,
  "availableCopies": 2
}
```

### ✅ **Correct Implementation:**
```json
{
  "id": 1,
  "title": "Mathematics 101",
  "author": "John Doe",
  "totalCopies": 3,
  "availableCopies": 2,  // Calculated from individual copy statuses
  "copies": [
    {
      "id": 101,
      "copyNumber": "MATH-001",
      "status": "available",
      "location": "Shelf A-1",
      "condition": "good"
    },
    {
      "id": 102,
      "copyNumber": "MATH-002", 
      "status": "borrowed",
      "borrowedBy": "user123",
      "dueDate": "2025-05-01",
      "location": "Shelf A-1",
      "condition": "good"
    },
    {
      "id": 103,
      "copyNumber": "MATH-003",
      "status": "available",
      "location": "Shelf A-1", 
      "condition": "good"
    }
  ]
}
```

## 🗄️ **Database Schema Changes**

### **1. Book Table (books)**
```sql
CREATE TABLE books (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  ddc VARCHAR(50),
  isbn VARCHAR(20),
  publisher VARCHAR(255),
  publication_year INT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **2. Book Copy Table (book_copies)**
```sql
CREATE TABLE book_copies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  book_id INT NOT NULL,
  copy_number VARCHAR(50) UNIQUE NOT NULL,  -- e.g., "MATH-001", "MATH-002"
  status ENUM('available', 'borrowed', 'reserved', 'damaged', 'lost', 'maintenance') DEFAULT 'available',
  location VARCHAR(100),  -- e.g., "Shelf A-1", "Room 101"
  condition ENUM('excellent', 'good', 'fair', 'poor', 'damaged') DEFAULT 'good',
  acquisition_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  INDEX idx_book_id (book_id),
  INDEX idx_status (status),
  INDEX idx_copy_number (copy_number)
);
```

### **3. Borrowing Table (borrowings)**
```sql
CREATE TABLE borrowings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  copy_id INT NOT NULL,
  user_id INT NOT NULL,
  borrowed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  returned_date TIMESTAMP NULL,
  status ENUM('active', 'returned', 'overdue', 'lost') DEFAULT 'active',
  
  FOREIGN KEY (copy_id) REFERENCES book_copies(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_copy_id (copy_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_due_date (due_date)
);
```

### **4. Reservations Table (reservations)**
```sql
CREATE TABLE reservations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  copy_id INT NOT NULL,
  user_id INT NOT NULL,
  reserved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP NOT NULL,
  status ENUM('active', 'expired', 'cancelled', 'fulfilled') DEFAULT 'active',
  
  FOREIGN KEY (copy_id) REFERENCES book_copies(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_copy_id (copy_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);
```

## 🔄 **API Endpoint Changes**

### **1. Get Books (Catalog) - `/api/books`**

#### **Current Response (❌ Wrong):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Mathematics 101",
      "author": "John Doe",
      "availability": "available",
      "totalCopies": 3,
      "availableCopies": 2
    }
  ]
}
```

#### **New Response (✅ Correct):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Mathematics 101",
      "author": "John Doe",
      "subject": "Mathematics",
      "ddc": "510.1",
      "isbn": "978-1234567890",
      "publisher": "Math Publishers",
      "publicationYear": 2023,
      "description": "Introduction to mathematics...",
      "totalCopies": 3,
      "availableCopies": 2,
      "coverImage": "https://example.com/cover.jpg"
    }
  ]
}
```

**Note:** Don't include individual copy details in the catalog view - only aggregated counts.

### **2. Get Book Details - `/api/books/{id}`**

#### **New Response (✅ Correct):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Mathematics 101",
    "author": "John Doe",
    "subject": "Mathematics",
    "ddc": "510.1",
    "isbn": "978-1234567890",
    "publisher": "Math Publishers",
    "publicationYear": 2023,
    "description": "Introduction to mathematics...",
    "totalCopies": 3,
    "availableCopies": 2,
    "coverImage": "https://example.com/cover.jpg",
    "copies": [
      {
        "id": 101,
        "copyNumber": "MATH-001",
        "status": "available",
        "location": "Shelf A-1",
        "condition": "good"
      },
      {
        "id": 102,
        "copyNumber": "MATH-002",
        "status": "borrowed",
        "borrowedBy": {
          "id": "user123",
          "name": "John Smith"
        },
        "dueDate": "2025-05-01T00:00:00Z",
        "location": "Shelf A-1",
        "condition": "good"
      },
      {
        "id": 103,
        "copyNumber": "MATH-003",
        "status": "available",
        "location": "Shelf A-1",
        "condition": "good"
      }
    ]
  }
}
```

### **3. Borrow Book - `/api/books/{id}/borrow`**

#### **Request:**
```json
{
  "userId": "user123",
  "copyId": 101,  // Specific copy ID, not book ID
  "expectedReturnDate": "2025-05-15T00:00:00Z"
}
```

#### **Response:**
```json
{
  "success": true,
  "data": {
    "borrowingId": "borrow456",
    "copyId": 101,
    "bookTitle": "Mathematics 101",
    "borrowedDate": "2025-04-15T10:00:00Z",
    "dueDate": "2025-05-15T00:00:00Z",
    "message": "Book borrowed successfully"
  }
}
```

## 🧮 **Business Logic Implementation**

### **1. Calculate Available Copies**
```sql
-- Count available copies for a book
SELECT COUNT(*) as available_copies
FROM book_copies 
WHERE book_id = ? AND status = 'available';
```

### **2. Update Copy Status on Borrow**
```sql
-- When borrowing a book
UPDATE book_copies 
SET status = 'borrowed' 
WHERE id = ? AND status = 'available';

-- Insert borrowing record
INSERT INTO borrowings (copy_id, user_id, due_date) 
VALUES (?, ?, ?);
```

### **3. Update Copy Status on Return**
```sql
-- When returning a book
UPDATE book_copies 
SET status = 'available' 
WHERE id = ?;

-- Update borrowing record
UPDATE borrowings 
SET returned_date = NOW(), status = 'returned' 
WHERE copy_id = ? AND status = 'active';
```

### **4. Handle Reservations**
```sql
-- When a copy becomes available, check for reservations
SELECT * FROM reservations 
WHERE copy_id = ? AND status = 'active' 
ORDER BY reserved_date ASC 
LIMIT 1;
```

## 📊 **Status Management**

### **Copy Statuses:**
- **`available`** - Copy can be borrowed
- **`borrowed`** - Copy is currently borrowed
- **`reserved`** - Copy is reserved for a specific user
- **`damaged`** - Copy is damaged and cannot be borrowed
- **`lost`** - Copy is lost
- **`maintenance`** - Copy is under maintenance

### **Status Transitions:**
```
available → borrowed (when borrowed)
borrowed → available (when returned)
available → reserved (when reserved)
reserved → available (when reservation expires)
available → damaged (when damaged)
damaged → available (when repaired)
available → lost (when lost)
```

## 🔍 **Search and Filter Queries**

### **1. Search Books with Availability**
```sql
SELECT 
  b.*,
  COUNT(bc.id) as total_copies,
  COUNT(CASE WHEN bc.status = 'available' THEN 1 END) as available_copies
FROM books b
LEFT JOIN book_copies bc ON b.id = bc.book_id
WHERE b.title LIKE ? OR b.author LIKE ? OR b.subject LIKE ?
GROUP BY b.id
HAVING available_copies > 0  -- Only show books with available copies
ORDER BY b.title;
```

### **2. Get User's Borrowed Books**
```sql
SELECT 
  b.title,
  b.author,
  bc.copy_number,
  br.due_date,
  br.status
FROM borrowings br
JOIN book_copies bc ON br.copy_id = bc.id
JOIN books b ON bc.book_id = b.id
WHERE br.user_id = ? AND br.status = 'active';
```

## 🚀 **Implementation Steps**

### **Phase 1: Database Schema (Week 1)**
1. Create new `book_copies` table
2. Create new `borrowings` table  
3. Create new `reservations` table
4. Migrate existing data if any

### **Phase 2: API Updates (Week 2)**
1. Update `/api/books` endpoint to return aggregated copy counts
2. Update `/api/books/{id}` endpoint to return individual copy details
3. Update borrowing logic to work with specific copies
4. Add copy status management endpoints

### **Phase 3: Business Logic (Week 3)**
1. Implement copy status transitions
2. Add reservation system
3. Update availability calculations
4. Add copy condition tracking

### **Phase 4: Testing & Optimization (Week 4)**
1. Test all scenarios (borrow, return, reserve, damage, etc.)
2. Optimize database queries
3. Add proper error handling
4. Performance testing

## 🧪 **Test Scenarios**

### **Test Case 1: Multiple Copies Available**
- Book has 3 copies, 2 available, 1 borrowed
- User should see "2 copies available"
- User can borrow one of the available copies

### **Test Case 2: All Copies Borrowed**
- Book has 3 copies, all borrowed
- User should see "No copies available"
- Borrow button should be disabled

### **Test Case 3: Copy Status Changes**
- Borrow a copy → status changes to "borrowed"
- Return a copy → status changes to "available"
- Damage a copy → status changes to "damaged"

### **Test Case 4: Reservation System**
- Reserve an available copy → status changes to "reserved"
- Reservation expires → status changes back to "available"

## ⚠️ **Common Pitfalls to Avoid**

1. **Don't use a single `availability` field** for the entire book
2. **Don't forget to update copy status** when borrowing/returning
3. **Don't forget to handle concurrent requests** (multiple users trying to borrow the same copy)
4. **Don't forget to validate copy status** before allowing operations
5. **Don't forget to update aggregated counts** when copy statuses change

## 🔒 **Concurrency Handling**

### **Optimistic Locking:**
```sql
-- When borrowing, check if copy is still available
UPDATE book_copies 
SET status = 'borrowed' 
WHERE id = ? AND status = 'available';

-- Check if update affected any rows
IF ROWS_AFFECTED = 0 THEN
  -- Copy is no longer available
  ROLLBACK;
END IF;
```

### **Database Transactions:**
```sql
START TRANSACTION;

-- Check availability
SELECT status FROM book_copies WHERE id = ? FOR UPDATE;

-- Update status
UPDATE book_copies SET status = 'borrowed' WHERE id = ?;

-- Create borrowing record
INSERT INTO borrowings (copy_id, user_id, due_date) VALUES (?, ?, ?);

COMMIT;
```

## 📱 **Frontend Integration**

The frontend has been updated to:
1. Display available copies count instead of single availability status
2. Show individual copy details in book details view
3. Handle copy-level operations (borrow specific copy)
4. Display proper availability messages

## 🎯 **Expected Results**

After implementation:
- ✅ Each book copy has its own availability status
- ✅ Users can see exactly how many copies are available
- ✅ Users can see individual copy details (location, condition, etc.)
- ✅ Proper reservation system works
- ✅ Copy status transitions are handled correctly
- ✅ Database queries are optimized for performance

## 📞 **Questions & Support**

If you have questions about this implementation:
1. Review the database schema carefully
2. Test the status transitions thoroughly
3. Ensure proper error handling for edge cases
4. Consider performance implications for large catalogs

This implementation will provide a much more accurate and user-friendly book availability system! 🚀
