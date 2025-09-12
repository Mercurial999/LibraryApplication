# 🚨 **URGENT: Missing API Endpoint Request**

## **Issue**: `COPY_NOT_FOUND` Error in Borrow Requests

The mobile app is failing to borrow books because we need one missing API endpoint to get the actual book copies.

---

## 📋 **What We Need (Just 1 API Endpoint)**

### **Missing API Endpoint**
```
GET /api/books/{bookId}/copies
```

**Purpose**: Get all available copies for a specific book so users can select which copy to borrow.

---

## 🔧 **Required Implementation**

### **Endpoint Details**
```http
GET /api/books/book-math-senior-006/copies
Authorization: Bearer {token}
```

### **Expected Response Format**
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
      },
      {
        "id": "copy_124",
        "bookId": "book-math-senior-006",
        "copyNumber": "Copy 2", 
        "status": "available",
        "location": "Library",
        "shelfLocation": "Fi/senH",
        "condition": "EXCELLENT"
      }
    ]
  }
}
```

### **Database Query**
```sql
SELECT * FROM book_copies 
WHERE book_id = '{bookId}' 
AND status = 'available'
```

---

## 🎯 **Why This Fixes the Problem**

### **Current Issue**
- Mobile app generates fake copy IDs like `copy_book-math-senior-006_1`
- Backend expects real copy IDs from database
- Result: `COPY_NOT_FOUND` error

### **After This API**
- Mobile app gets real copy IDs from database
- Users select actual available copies
- Borrow requests work with real copy IDs
- Result: ✅ Success!

---

## 🧪 **Test This API**

```bash
# Test the new endpoint
curl -X GET "https://kcmi-library-system.vercel.app/api/books/book-math-senior-006/copies" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected**: List of available copies for the book

---

## 📱 **Mobile App Changes (We'll Handle)**

Once you provide this API, we will:

1. ✅ Update mobile app to call this API
2. ✅ Display real copies to users
3. ✅ Use real copy IDs for borrow requests
4. ✅ Fix the `COPY_NOT_FOUND` error

---

## ⚡ **Priority: HIGH**

This is the only missing piece preventing borrow requests from working. Once this API is available, the entire borrowing system will function correctly.

---

**Please implement this single API endpoint and let us know when it's ready for testing.**
