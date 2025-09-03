# Backend Overdue Integration Guide for Mobile App

This guide explains what your backend needs to implement to properly support the mobile app's overdue fines system.

**Reference base URL:** `https://kcmi-library-system.vercel.app`

---

## 🚨 **Current Status: OVERDUE SYSTEM NOT CONNECTED**

Your mobile app is **NOT properly connected** to your backend's overdue system. Here's what's missing and what needs to be implemented.

---

## 📋 **Required Backend API Endpoints**

### **1. Get User's Overdue Transactions** ⚠️ **MISSING**

**Endpoint:** `GET /api/mobile/users/{userId}/overdue-transactions`

**Purpose:** Fetch all overdue transactions for a specific user

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "trans_123",
      "bookId": "book_456",
      "userId": "user_789",
      "borrowDate": "2024-01-01T00:00:00.000Z",
      "dueDate": "2024-01-15T00:00:00.000Z",
      "returnDate": null,
      "status": "OVERDUE",
      "dailyFineRate": 5.00,
      "book": {
        "id": "book_456",
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "isbn": "9780743273565"
      }
    }
  ]
}
```

**Business Logic Required:**
- **3-Day Grace Period**: Calculate overdue only after 3 days past due date
- **Daily Fine Rate**: Apply fine rate per day after grace period
- **Book Information**: Include book details for display

---

### **2. Get User's Fines** ⚠️ **MISSING**

**Endpoint:** `GET /api/mobile/users/{userId}/fines`

**Purpose:** Fetch all fines (overdue and other charges) for a user

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "fine_123",
      "userId": "user_789",
      "transactionId": "trans_123",
      "type": "OVERDUE",
      "amountDue": 25.00,
      "amountPaid": 0.00,
      "status": "UNPAID",
      "createdDate": "2024-01-18T00:00:00.000Z",
      "dueDate": "2024-01-20T00:00:00.000Z",
      "description": "Overdue fine for The Great Gatsby (5 days overdue)"
    }
  ]
}
```

**Business Logic Required:**
- **Fine Calculation**: Calculate overdue fines based on your business rules
- **Payment Tracking**: Track paid vs unpaid fines
- **Fine Types**: Support different fine types (overdue, damage, lost, etc.)

---

### **3. Overdue Notification System** ✅ **EXISTS**

**Endpoint:** `POST /api/overdue-transactions/{transactionId}/notify`

**Purpose:** Send overdue notifications to users

**Current Status:** ✅ **Already implemented in your backend**

---

### **4. Notification Status Check** ✅ **EXISTS**

**Endpoint:** `GET /api/overdue-transactions/{transactionId}/notification-status`

**Purpose:** Check notification status and cooldown

**Current Status:** ✅ **Already implemented in your backend**

---

## 🔧 **Business Logic Implementation**

### **Overdue Calculation Rules:**

```javascript
// Example backend implementation
const calculateOverdueFine = (dueDate, dailyFineRate = 5.00) => {
  const now = new Date();
  const due = new Date(dueDate);
  
  // 3-day grace period
  const gracePeriod = 3;
  const daysOverdue = Math.max(0, Math.floor((now - due) / (1000 * 60 * 60 * 24)) - gracePeriod);
  
  if (daysOverdue <= 0) {
    return 0; // Within grace period
  }
  
  return daysOverdue * dailyFineRate;
};
```

### **Fine Status Management:**

```javascript
// Fine statuses your backend should support
const FINE_STATUSES = {
  UNPAID: 'UNPAID',      // Fine created, not yet paid
  PARTIAL: 'PARTIAL',    // Partial payment made
  PAID: 'PAID',          // Full payment received
  WAIVED: 'WAIVED',      // Fine waived by librarian
  DISPUTED: 'DISPUTED'   // Fine under dispute
};
```

---

## 📱 **Mobile App Integration Points**

### **What the Mobile App Now Does:**

1. **Fetches Overdue Data**: Calls both overdue transactions and fines APIs
2. **Calculates Fines**: Applies 3-day grace period logic
3. **Displays Overdue Books**: Shows overdue books with fine calculations
4. **Real-time Updates**: Refreshes data when user pulls to refresh

### **Data Flow:**

```
Mobile App → Backend APIs → Database → Response → Mobile Display
     ↓              ↓           ↓         ↓          ↓
  User opens   Fetches     Calculates  Returns    Shows overdue
  fines screen overdue     fines based  data      books & amounts
              transactions  on business
              & fines      rules
```

---

## 🚀 **Implementation Priority**

### **Phase 1 (Critical - Mobile App Won't Work Without These):**

1. **Implement `GET /api/mobile/users/{userId}/overdue-transactions`**
   - Calculate overdue after 3-day grace period
   - Include book information
   - Support daily fine rate

2. **Implement `GET /api/mobile/users/{userId}/fines`**
   - Return all fines for the user
   - Include payment status
   - Support different fine types

### **Phase 2 (Important - Enhanced User Experience):**

1. **Fine Payment Processing**
   - `POST /api/mobile/users/{userId}/fines/{fineId}/pay`
   - Payment confirmation
   - Receipt generation

2. **Fine Dispute System**
   - `POST /api/mobile/users/{userId}/fines/{fineId}/dispute`
   - Dispute reason tracking
   - Status updates

### **Phase 3 (Optional - Advanced Features):**

1. **Fine History and Analytics**
   - Payment trends
   - Fine patterns
   - User behavior insights

---

## 🧪 **Testing Scenarios**

### **Test Case 1: 3-Day Grace Period**
```
Book due: January 15, 2024
Test date: January 18, 2024
Expected: No fine (within grace period)
```

### **Test Case 2: Overdue After Grace Period**
```
Book due: January 15, 2024
Test date: January 19, 2024
Expected: 1 day overdue = ₱5.00 fine
```

### **Test Case 3: Multiple Overdue Books**
```
Book 1: 2 days overdue = ₱10.00
Book 2: 5 days overdue = ₱25.00
Total expected: ₱35.00
```

---

## 📊 **Database Schema Requirements**

### **Overdue Transactions Table:**
```sql
CREATE TABLE overdue_transactions (
  id VARCHAR(255) PRIMARY KEY,
  bookId VARCHAR(255) NOT NULL,
  userId VARCHAR(255) NOT NULL,
  borrowDate DATETIME NOT NULL,
  dueDate DATETIME NOT NULL,
  returnDate DATETIME NULL,
  status ENUM('ACTIVE', 'OVERDUE', 'RETURNED') NOT NULL,
  dailyFineRate DECIMAL(10,2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### **Fines Table:**
```sql
CREATE TABLE fines (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  transactionId VARCHAR(255) NULL,
  type ENUM('OVERDUE', 'DAMAGE', 'LOST', 'OTHER') NOT NULL,
  amountDue DECIMAL(10,2) NOT NULL,
  amountPaid DECIMAL(10,2) DEFAULT 0.00,
  status ENUM('UNPAID', 'PARTIAL', 'PAID', 'WAIVED', 'DISPUTED') NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## 🔐 **Security Considerations**

### **Authentication:**
- All endpoints require valid JWT token
- Verify user owns the data being accessed
- Rate limiting on fine calculations

### **Data Validation:**
- Validate due dates and fine calculations
- Prevent negative fine amounts
- Sanitize user inputs

---

## 📞 **Integration Notes**

### **Current Mobile App Status:**
- ✅ **UI Ready**: Fines screen fully implemented
- ✅ **API Methods**: All methods added to ApiService
- ✅ **Business Logic**: 3-day grace period logic implemented
- ❌ **Backend APIs**: Missing required endpoints

### **What Happens When APIs Are Missing:**
- Mobile app will show error messages
- Users won't see their overdue books
- Fine calculations won't work
- Overall user experience will be broken

---

## 🎯 **Success Metrics**

Your overdue system integration is successful when:

- ✅ Mobile app can fetch overdue transactions
- ✅ Mobile app can fetch user fines
- ✅ 3-day grace period is properly applied
- ✅ Fine calculations are accurate
- ✅ Overdue books display correctly
- ✅ Payment statuses are tracked
- ✅ Error handling works properly

---

## 🚀 **Next Steps for Your Backend Team**

1. **Implement Missing APIs** (Critical)
   - `GET /api/mobile/users/{userId}/overdue-transactions`
   - `GET /api/mobile/users/{userId}/fines`

2. **Test Business Logic**
   - Verify 3-day grace period
   - Test fine calculations
   - Validate data formats

3. **Mobile App Testing**
   - Test with real user data
   - Verify overdue display
   - Check fine calculations

---

**Status:** ❌ **BACKEND IMPLEMENTATION REQUIRED**  
**Mobile App:** ✅ **READY FOR INTEGRATION**  
**Priority:** 🔴 **CRITICAL - APP WON'T WORK WITHOUT THESE APIs**

---

**The mobile app is fully prepared for overdue integration. You just need to implement the missing backend endpoints!** 🚀

**Last Updated:** 2025-08-27  
**Implementation Status:** Backend APIs Missing
