# 📚 Book Reservation System - Backend Implementation Guide

## 🎯 **Overview**

This document outlines the **required backend changes** to implement a comprehensive book reservation system that integrates with the new Book Condition Tracking System. The mobile app now includes condition assessment for reservations, which is **MANDATORY** for the system to work properly.

---

## 🔧 **Required Backend Changes**

### **1. New API Endpoint: Book Reservation**

#### **Endpoint:**
```
POST /api/mobile/users/{userId}/books/{bookId}/reserve
```

#### **Request Body (REQUIRED):**
```json
{
  "expectedReturnDate": "2024-02-15T00:00:00.000Z",
  "initialCondition": "GOOD",           // ← REQUIRED: Book condition on reservation
  "conditionNotes": "Minor wear on cover" // ← OPTIONAL: Reservation notes
}
```

#### **Response Format:**
```json
{
  "success": true,
  "message": "Book reserved successfully",
  "data": {
    "reservationId": "res_1234567890",
    "bookId": "bk_1755311609939_qoz9tp",
    "userId": "user_123",
    "reservationDate": "2024-01-15T10:30:00.000Z",
    "expectedReturnDate": "2024-02-15T00:00:00.000Z",
    "status": "PENDING",
    "initialCondition": "GOOD",
    "conditionNotes": "Minor wear on cover"
  }
}
```

---

## 🗄️ **Database Schema Changes**

### **1. New Table: `book_reservations`**

```sql
CREATE TABLE book_reservations (
  id VARCHAR(50) PRIMARY KEY,
  book_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  book_copy_id VARCHAR(50), -- Optional: specific copy if available
  reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expected_return_date TIMESTAMP NOT NULL,
  status ENUM('PENDING', 'ACTIVE', 'FULFILLED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING',
  initial_condition ENUM('EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED') NOT NULL,
  condition_notes TEXT,
  fulfilled_date TIMESTAMP NULL,
  cancelled_date TIMESTAMP NULL,
  cancelled_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_copy_id) REFERENCES book_copies(id),
  
  INDEX idx_book_id (book_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_reservation_date (reservation_date)
);
```

### **2. Update `book_copies` Table**

```sql
ALTER TABLE book_copies 
ADD COLUMN reserved_by VARCHAR(50) NULL,
ADD COLUMN reservation_id VARCHAR(50) NULL,
ADD COLUMN reservation_date TIMESTAMP NULL,
ADD FOREIGN KEY (reserved_by) REFERENCES users(id),
ADD FOREIGN KEY (reservation_id) REFERENCES book_reservations(id);
```

---

## 🔄 **Business Logic Implementation**

### **1. Reservation Rules & Validation**

#### **Eligibility Checks:**
- User must have a valid library account
- User must not have overdue books
- Book must have borrowed copies (not all copies available)
- User cannot reserve a book they already have borrowed
- User cannot reserve a book they already have reserved

#### **Reservation Priority:**
- First-come, first-served basis
- Users can only have one active reservation per book
- Reservations expire after 30 days if not fulfilled

### **2. Reservation Flow**

```typescript
// Pseudo-code for reservation process
async function reserveBook(userId: string, bookId: string, reserveData: ReserveData) {
  // 1. Validate user eligibility
  const userEligible = await checkUserEligibility(userId);
  if (!userEligible) {
    throw new Error('User not eligible for reservations');
  }

  // 2. Check book availability for reservation
  const book = await getBookWithCopies(bookId);
  if (book.availableCopies >= book.totalCopies) {
    throw new Error('Book has available copies - no reservation needed');
  }

  // 3. Check if user already has reservation for this book
  const existingReservation = await checkExistingReservation(userId, bookId);
  if (existingReservation) {
    throw new Error('User already has a reservation for this book');
  }

  // 4. Create reservation record
  const reservation = await createReservation({
    bookId,
    userId,
    expectedReturnDate: reserveData.expectedReturnDate,
    initialCondition: reserveData.initialCondition, // ← REQUIRED
    conditionNotes: reserveData.conditionNotes
  });

  // 5. Update book copy status (if specific copy is reserved)
  if (reserveData.bookCopyId) {
    await updateBookCopyStatus(reserveData.bookCopyId, 'reserved', userId, reservation.id);
  }

  return reservation;
}
```

### **3. Reservation Fulfillment**

```typescript
// When a book is returned, check for pending reservations
async function checkAndFulfillReservations(bookId: string, returnedCopyId: string) {
  // 1. Get pending reservations for this book
  const pendingReservations = await getPendingReservations(bookId);
  
  if (pendingReservations.length > 0) {
    // 2. Get the oldest reservation (FIFO)
    const oldestReservation = pendingReservations[0];
    
    // 3. Update reservation status
    await updateReservationStatus(oldestReservation.id, 'ACTIVE');
    
    // 4. Update book copy status
    await updateBookCopyStatus(returnedCopyId, 'reserved', oldestReservation.userId, oldestReservation.id);
    
    // 5. Send notification to user
    await sendReservationFulfilledNotification(oldestReservation.userId, bookId);
  }
}
```

---

## 📱 **Mobile App Integration Points**

### **1. Condition Assessment Integration**

The mobile app now **REQUIRES** condition assessment for all reservations:

```typescript
// Mobile app will send this data
{
  "expectedReturnDate": "2024-02-15T00:00:00.000Z",
  "initialCondition": "GOOD",           // ← REQUIRED
  "conditionNotes": "Minor wear on cover" // ← OPTIONAL
}
```

### **2. Reservation Status Updates**

The mobile app needs to track reservation status:

```typescript
// GET /api/mobile/users/{userId}/reservations
{
  "success": true,
  "data": {
    "reservations": [
      {
        "id": "res_123",
        "bookId": "bk_456",
        "bookTitle": "Sample Book",
        "status": "PENDING",
        "reservationDate": "2024-01-15T10:30:00.000Z",
        "expectedReturnDate": "2024-02-15T00:00:00.000Z",
        "initialCondition": "GOOD",
        "conditionNotes": "Minor wear on cover"
      }
    ]
  }
}
```

---

## 🚨 **Critical Implementation Notes**

### **1. Breaking Changes**
- **OLD**: Reservations without condition assessment
- **NEW**: **Condition assessment is MANDATORY** for all reservations
- **Impact**: Old reservation requests will fail without condition fields

### **2. Required Fields**
- `initialCondition`: Must be one of: EXCELLENT, GOOD, FAIR, POOR, DAMAGED
- `expectedReturnDate`: ISO 8601 timestamp
- `conditionNotes`: Optional but recommended for audit trail

### **3. Error Handling**
```typescript
// Required field missing
if (!reserveData.initialCondition) {
  return {
    success: false,
    message: "initialCondition is required for book reservations",
    error: "MISSING_REQUIRED_FIELD"
  };
}

// Invalid condition value
const validConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
if (!validConditions.includes(reserveData.initialCondition)) {
  return {
    success: false,
    message: "Invalid condition value. Must be one of: EXCELLENT, GOOD, FAIR, POOR, DAMAGED",
    error: "INVALID_CONDITION_VALUE"
  };
}
```

---

## 🧪 **Testing Requirements**

### **1. Test Cases for Backend Team**

#### **Reservation Creation:**
- [ ] Can create reservation with valid condition data
- [ ] Rejects reservation without condition assessment
- [ ] Rejects reservation with invalid condition values
- [ ] Prevents duplicate reservations from same user
- [ ] Validates user eligibility

#### **Reservation Fulfillment:**
- [ ] Automatically fulfills reservations when books are returned
- [ ] Updates book copy status correctly
- [ ] Sends notifications to users
- [ ] Handles multiple pending reservations (FIFO)

#### **Error Handling:**
- [ ] Returns proper error messages for missing fields
- [ ] Handles invalid condition values gracefully
- [ ] Provides clear validation errors

### **2. API Testing**

#### **Valid Reservation Request:**
```bash
curl -X POST "https://your-api.com/api/mobile/users/user_123/books/bk_456/reserve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "expectedReturnDate": "2024-02-15T00:00:00.000Z",
    "initialCondition": "GOOD",
    "conditionNotes": "Book in good condition"
  }'
```

#### **Invalid Request (Missing Condition):**
```bash
curl -X POST "https://your-api.com/api/mobile/users/user_123/books/bk_456/reserve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "expectedReturnDate": "2024-02-15T00:00:00.000Z"
  }'
```

---

## 📅 **Implementation Timeline**

### **Phase 1 (Week 1) - Critical**
- [ ] Create `book_reservations` table
- [ ] Update `book_copies` table
- [ ] Implement reservation creation endpoint
- [ ] Add condition assessment validation

### **Phase 2 (Week 2) - Important**
- [ ] Implement reservation fulfillment logic
- [ ] Add reservation status management
- [ ] Create reservation query endpoints
- [ ] Add notification system

### **Phase 3 (Week 3) - Enhancement**
- [ ] Add reservation expiration handling
- [ ] Implement reservation cancellation
- [ ] Add reservation analytics
- [ ] Performance optimization

---

## 🔗 **Related API Endpoints**

### **1. Get User Reservations**
```
GET /api/mobile/users/{userId}/reservations
```

### **2. Cancel Reservation**
```
DELETE /api/mobile/users/{userId}/reservations/{reservationId}
```

### **3. Get Book Reservation Queue**
```
GET /api/books/{bookId}/reservations
```

---

## 📞 **Support & Questions**

### **Contact Information:**
- **Mobile Team**: For frontend integration questions
- **Documentation**: Check `BOOK_CONDITION_TRACKING_SYSTEM.md`
- **API Testing**: Use Postman/Insomnia to test endpoints

### **Common Issues:**
- **Condition Field Missing**: Ensure all reservation requests include condition
- **Type Mismatches**: Use correct condition values (EXCELLENT, GOOD, FAIR, POOR, DAMAGED)
- **Database Constraints**: Check foreign key relationships and indexes

---

## ✅ **Checklist for Backend Team**

### **Before Release:**
- [ ] Database schema updated
- [ ] Reservation endpoint implemented
- [ ] Condition assessment validation working
- [ ] Reservation fulfillment logic implemented
- [ ] Error handling comprehensive
- [ ] API documentation updated
- [ ] Testing completed
- [ ] Performance tested

---

## 🎯 **Summary**

The book reservation system **MUST** include condition assessment to work with the updated mobile app. This is not optional - it's required for system functionality.

**Key Points:**
1. **Condition assessment is MANDATORY** for all reservations
2. **New database tables** are required for reservation tracking
3. **Reservation fulfillment** must be automated when books are returned
4. **Mobile app integration** requires proper error handling and status updates

**Failure to implement these changes will result in:**
- Broken reservation functionality
- Incomplete audit trails
- Poor user experience
- System integration failures

**Start implementation immediately** to ensure smooth system operation! 🚀
