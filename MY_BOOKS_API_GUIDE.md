# 📚 My Books API Integration Guide

## Overview
The My Books screen allows users to view and manage their borrowed books, including returning, renewing, and reporting books. This guide outlines all the API endpoints required for full functionality.

## 🔗 Required API Endpoints

### 1. Get User Books (Already Implemented)
**Endpoint:** `GET /api/mobile/users/{userId}/books`

**Query Parameters:**
- `status` (optional): Filter by status ('borrowed', 'returned', 'overdue', 'all')
- `includeHistory` (optional): Include returned books in response (true/false)

**Response Format:**
```json
{
  "success": true,
  "data": {
    "borrowedBooks": [
      {
        "id": "borrow_1",
        "bookId": "bk_1755311609939_qoz9tp",
        "bookTitle": "Physical Education 1",
        "bookAuthor": "Jhonny Depp, Super Man",
        "bookCover": "",
        "borrowDate": "2024-01-01T10:00:00Z",
        "dueDate": "2024-01-15T10:00:00Z",
        "returnDate": null,
        "status": "borrowed",
        "daysRemaining": 5,
        "isOverdue": false,
        "fineAmount": 0,
        "fineStatus": "none",
        "renewalCount": 0,
        "maxRenewals": 2
      }
    ],
    "returnedBooks": [
      {
        "id": "borrow_2",
        "bookId": "book_003",
        "bookTitle": "MAPEH 1",
        "bookAuthor": "Maria Garcia",
        "bookCover": "",
        "borrowDate": "2023-12-01T10:00:00Z",
        "dueDate": "2023-12-15T10:00:00Z",
        "returnDate": "2023-12-10T10:00:00Z",
        "status": "returned",
        "daysRemaining": 0,
        "isOverdue": false,
        "fineAmount": 0,
        "fineStatus": "none",
        "renewalCount": 1,
        "maxRenewals": 2
      }
    ],
    "overdueBooks": [
      {
        "id": "borrow_3",
        "bookId": "book_001",
        "bookTitle": "Programming 1",
        "bookAuthor": "John Doe",
        "bookCover": "",
        "borrowDate": "2023-11-01T10:00:00Z",
        "dueDate": "2023-11-15T10:00:00Z",
        "returnDate": null,
        "status": "overdue",
        "daysRemaining": -5,
        "isOverdue": true,
        "fineAmount": 2.50,
        "fineStatus": "pending",
        "renewalCount": 0,
        "maxRenewals": 2
      }
    ]
  }
}
```

### 2. Return Book
**Endpoint:** `POST /api/mobile/users/{userId}/books/{bookId}/return`

**Purpose:** Allow users to return borrowed books.

**Request Body:**
```json
{
  "condition": "good",
  "notes": "Returned via mobile app",
  "returnDate": "2024-01-10T10:00:00Z"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "borrow_1",
    "bookId": "bk_1755311609939_qoz9tp",
    "returnDate": "2024-01-10T10:00:00Z",
    "condition": "good",
    "fineAmount": 0,
    "message": "Book returned successfully"
  }
}
```

**Implementation Notes:**
- Validate that the book is currently borrowed by the user
- Check if the book is overdue and calculate fines
- Update the borrowing record with return information
- Update book availability status

### 3. Renew Book
**Endpoint:** `POST /api/mobile/users/{userId}/books/{bookId}/renew`

**Purpose:** Allow users to renew borrowed books.

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "borrow_1",
    "bookId": "bk_1755311609939_qoz9tp",
    "oldDueDate": "2024-01-15T10:00:00Z",
    "newDueDate": "2024-01-29T10:00:00Z",
    "renewalCount": 1,
    "maxRenewals": 2,
    "message": "Book renewed successfully"
  }
}
```

**Implementation Notes:**
- Check if the book is eligible for renewal (not overdue, within renewal limit)
- Calculate new due date based on library policy
- Update the borrowing record with new due date
- Increment renewal count

### 4. Report Book
**Endpoint:** `POST /api/mobile/users/{userId}/books/{bookId}/report`

**Purpose:** Allow users to report books as lost or damaged.

**Request Body:**
```json
{
  "reportType": "lost",
  "description": "I lost the book while traveling",
  "reportDate": "2024-01-10T10:00:00Z"
}
```

**Response Format:**
```json
{
  "success": true,
  "data": {
    "id": "report_1",
    "bookId": "bk_1755311609939_qoz9tp",
    "reportType": "lost",
    "description": "I lost the book while traveling",
    "status": "pending",
    "reportDate": "2024-01-10T10:00:00Z",
    "message": "Report submitted successfully"
  }
}
```

**Implementation Notes:**
- Create a new report record
- Update the borrowing status to reflect the report
- Calculate replacement cost if applicable
- Notify library staff of the report

## 📱 Mobile App Features

### Tab Navigation
- **Borrowed Books**: Currently borrowed books with return/renew options
- **Returned Books**: History of returned books
- **Overdue Books**: Overdue books with fine information

### Book Actions
- **Return Book**: Return borrowed books with condition notes
- **Renew Book**: Extend borrowing period (if eligible)
- **Report Book**: Report lost or damaged books

### Status Indicators
- **Borrowed**: Blue status badge
- **Returned**: Green status badge
- **Overdue**: Red status badge with fine amount
- **Due Soon**: Orange status badge (3 days or less)

### Book Information Display
- Book title and author
- Borrow date and due date
- Days remaining or overdue status
- Fine amount (if applicable)
- Renewal count and limit

## 🔄 Business Logic Requirements

### Book Return Logic
1. **Validation**: Ensure book is currently borrowed by the user
2. **Fine Calculation**: Calculate overdue fines if applicable
3. **Condition Assessment**: Record book condition on return
4. **Status Update**: Update book availability and borrowing status

### Book Renewal Logic
1. **Eligibility Check**: Verify book can be renewed
   - Not overdue
   - Within renewal limit
   - No holds on the book
2. **Due Date Extension**: Extend due date based on library policy
3. **Renewal Tracking**: Increment renewal count

### Book Reporting Logic
1. **Report Creation**: Create detailed report record
2. **Status Update**: Update borrowing status to "reported"
3. **Fine Assessment**: Calculate replacement cost if applicable
4. **Staff Notification**: Alert library staff of the report

## 🗄️ Database Schema Requirements

### Borrowings Table
```sql
CREATE TABLE borrowings (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  book_id VARCHAR(255) NOT NULL,
  borrow_date TIMESTAMP NOT NULL,
  due_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP NULL,
  status ENUM('borrowed', 'returned', 'overdue', 'reported') NOT NULL,
  renewal_count INT DEFAULT 0,
  max_renewals INT DEFAULT 2,
  fine_amount DECIMAL(10,2) DEFAULT 0,
  fine_status ENUM('none', 'pending', 'paid') DEFAULT 'none',
  condition_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);
```

### Reports Table
```sql
CREATE TABLE reports (
  id VARCHAR(255) PRIMARY KEY,
  borrowing_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  book_id VARCHAR(255) NOT NULL,
  report_type ENUM('lost', 'damaged') NOT NULL,
  description TEXT NOT NULL,
  status ENUM('pending', 'reviewed', 'resolved') DEFAULT 'pending',
  replacement_cost DECIMAL(10,2) DEFAULT 0,
  report_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_date TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (borrowing_id) REFERENCES borrowings(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_id) REFERENCES books(id)
);
```

## 🔧 Testing Scenarios

### Book Return Testing
- [ ] Return book before due date (no fine)
- [ ] Return book after due date (with fine calculation)
- [ ] Return book with condition notes
- [ ] Attempt to return already returned book (error)

### Book Renewal Testing
- [ ] Renew book within renewal limit
- [ ] Attempt to renew overdue book (error)
- [ ] Attempt to renew beyond max renewals (error)
- [ ] Renew book with holds (error)

### Book Reporting Testing
- [ ] Report book as lost
- [ ] Report book as damaged
- [ ] Submit report with description
- [ ] Verify report status updates

### Edge Cases
- [ ] User with no borrowed books
- [ ] User with multiple overdue books
- [ ] User with maximum renewals reached
- [ ] Network error handling

## 🚀 Implementation Priority

### High Priority (Core Functionality)
1. **Get User Books** - Already implemented ✅
2. **Return Book** - Essential for book management
3. **Renew Book** - Important user feature
4. **Report Book** - Critical for book tracking

### Medium Priority (Enhancements)
1. **Fine Calculation** - Automatic fine computation
2. **Condition Assessment** - Book condition tracking
3. **Renewal Limits** - Prevent excessive renewals

### Low Priority (Advanced Features)
1. **Hold Management** - Prevent renewal of held books
2. **Email Notifications** - Notify users of actions
3. **Staff Dashboard** - Library staff interface

## 📋 API Testing Commands

```bash
# Get user books
curl -H "Authorization: Bearer {token}" \
  https://kcmi-library-system.vercel.app/api/mobile/users/{userId}/books?status=all&includeHistory=true

# Return book
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"condition": "good", "notes": "Returned via mobile app"}' \
  https://kcmi-library-system.vercel.app/api/mobile/users/{userId}/books/{bookId}/return

# Renew book
curl -X POST -H "Authorization: Bearer {token}" \
  https://kcmi-library-system.vercel.app/api/mobile/users/{userId}/books/{bookId}/renew

# Report book
curl -X POST -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"reportType": "lost", "description": "Lost while traveling"}' \
  https://kcmi-library-system.vercel.app/api/mobile/users/{userId}/books/{bookId}/report
```

## 🎯 Expected Results

Once implemented, the My Books screen will provide:
- ✅ Real-time book status and information
- ✅ Seamless book return and renewal process
- ✅ Proper fine calculation and display
- ✅ Book reporting functionality
- ✅ Tab-based organization of books
- ✅ Pull-to-refresh for updated data
- ✅ Error handling and user feedback

The My Books functionality will give users complete control over their library borrowing experience with a modern, intuitive interface.
