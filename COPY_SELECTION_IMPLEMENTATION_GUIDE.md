# Copy Selection Implementation Guide

## ✅ **Mobile App Copy Selection - COMPLETED**

The mobile app has been fully updated to support copy-level borrowing, returning, and renewing as requested by the backend.

## 📱 **Frontend Implementation Summary**

### **1. Book Details Screen Updates**
- **Copy Selection UI**: Available copies are now selectable with visual feedback
- **Copy Information Display**: Shows copy number, status, location, condition, borrower, and due date
- **Validation**: Borrow button only appears after copy selection
- **Visual Feedback**: Selected copies show checkmark and highlighted border

### **2. Borrow Flow Updates**
- **Copy Selection Required**: Users must select a specific copy before borrowing
- **CopyId Passing**: Selected copyId is passed to the borrow screen
- **API Integration**: Borrow requests now include `copyId` parameter
- **Error Handling**: Validates copy availability before proceeding

### **3. Return/Renew Updates**
- **CopyId Support**: Return and renew operations include `copyId` if available
- **Backward Compatibility**: Works with existing API responses that may not include copyId
- **Condition Assessment**: Maintains existing condition assessment workflow

### **4. Reservation Updates**
- **No Condition Assessment**: Users can view book conditions but cannot edit them
- **Book Conditions Display**: Shows copy details, status, and condition history
- **Backend Condition Handling**: Backend handles condition assessment during reservation
- **Reserve Button**: Added to book details screen for unavailable books

## 🔧 **API Integration Details**

### **Updated API Calls**

#### **1. Borrow Book**
```javascript
// POST /api/mobile/users/{userId}/books/{bookId}/borrow
const response = await ApiService.borrowBook(userId, bookId, {
  copyId: selectedCopy.id,           // ✅ REQUIRED: Specific copy
  expectedReturnDate: dueDate,       // ✅ REQUIRED: ISO date
  initialCondition: condition,       // ✅ REQUIRED: Condition assessment
  conditionNotes: notes              // ✅ OPTIONAL: Additional notes
});
```

#### **2. Return Book**
```javascript
// POST /api/mobile/users/{userId}/books/{bookId}/return
const response = await ApiService.returnBook(userId, bookId, {
  copyId: book.copyId,               // ✅ REQUIRED: Specific copy (if available)
  condition: condition,              // ✅ REQUIRED: Condition assessment
  notes: notes                       // ✅ OPTIONAL: Return notes
});
```

#### **3. Renew Book**
```javascript
// POST /api/mobile/users/{userId}/books/{bookId}/renew
const response = await ApiService.renewBook(userId, bookId, {
  copyId: book.copyId                // ✅ REQUIRED: Specific copy (if available)
});
```

#### **4. Reserve Book**
```javascript
// POST /api/mobile/users/{userId}/books/{bookId}/reserve
const response = await ApiService.reserveBook(userId, bookId, {
  expectedReturnDate: dueDate        // ✅ REQUIRED: ISO date
  // No condition assessment required - backend will handle it
});
```

## 🎨 **User Experience Flow**

### **1. Book Details Screen**
1. User views book details with copy information
2. Available copies are highlighted and selectable
3. User taps on an available copy to select it
4. Selected copy shows visual confirmation (checkmark, highlighted border)
5. Borrow button changes to "Borrow Selected Copy"
6. User taps borrow button to proceed

### **2. Borrow Screen**
1. Selected copy information is displayed
2. User confirms borrowing details
3. Condition assessment modal opens
4. User selects condition and adds notes
5. API call includes copyId and condition data
6. Success/error feedback provided

### **3. My Books Screen**
1. Return/renew operations include copyId if available
2. Maintains existing condition assessment workflow
3. Backward compatible with API responses without copyId

### **4. Reservation Flow**
1. User clicks "Reserve This Book" on unavailable books
2. Book conditions modal opens showing copy details and history
3. User can view conditions but cannot edit them
4. User confirms reservation without condition assessment
5. Backend handles condition assessment during reservation process

## 📊 **Data Requirements**

### **Backend API Response Structure**

#### **Book Details API** (`GET /api/mobile/books/{bookId}`)
```json
{
  "success": true,
  "data": {
    "id": "BOOK_ID",
    "title": "...",
    "author": "...",
    "totalCopies": 3,
    "availableCopies": 2,
    "copies": [
      {
        "id": "COPY_ID_1",           // ✅ REQUIRED: Unique copy identifier
        "copyNumber": "MATH-001",    // ✅ REQUIRED: Human-readable copy number
        "status": "AVAILABLE",       // ✅ REQUIRED: Uppercase status
        "location": "Shelf A-1",     // ✅ OPTIONAL: Physical location
        "condition": "GOOD",         // ✅ OPTIONAL: Current condition
        "borrowedBy": null,          // ✅ OPTIONAL: Borrower info if borrowed
        "dueDate": null,             // ✅ OPTIONAL: Due date if borrowed
        "reservedBy": null           // ✅ OPTIONAL: Reservation info if reserved
      }
    ]
  }
}
```

#### **User Books API** (`GET /api/mobile/users/{userId}/books`)
```json
{
  "success": true,
  "data": {
    "borrowedBooks": [
      {
        "id": "BOOK_ID",
        "copyId": "COPY_ID_1",       // ✅ REQUIRED: For return/renew operations
        "bookTitle": "...",
        "dueDate": "2025-12-31T00:00:00Z",
        // ... other book details
      }
    ]
  }
}
```

## 🚨 **Critical Backend Requirements**

### **1. CopyId in User Books Response**
The `GET /api/mobile/users/{userId}/books` endpoint **MUST** include `copyId` in each borrowed book object for return/renew operations to work properly.

### **2. Status Values**
All status values must be **UPPERCASE**:
- `AVAILABLE`
- `BORROWED`
- `RESERVED`
- `DAMAGED`
- `LOST`
- `MAINTENANCE`

### **3. CopyId Validation**
- Borrow: Validate copyId belongs to bookId and status is `AVAILABLE`
- Return: Validate active borrow exists for userId/bookId/copyId
- Renew: Validate active borrow exists for userId/bookId/copyId

## 🧪 **Testing Checklist**

### **Frontend Testing** ✅
- [x] Copy selection UI works correctly
- [x] Visual feedback for selected copies
- [x] Borrow button validation
- [x] CopyId passing to borrow screen
- [x] API calls include copyId
- [x] Error handling for missing copyId
- [x] Backward compatibility with existing APIs

### **Backend Testing** 🔄
- [ ] Book details API returns copy array with all required fields
- [ ] User books API includes copyId for borrowed books
- [ ] Borrow API validates copyId and availability
- [ ] Return API validates copyId and active borrow
- [ ] Renew API validates copyId and active borrow
- [ ] 409 conflicts for unavailable copies
- [ ] 400 errors for missing copyId

## 🔄 **Migration Notes**

### **Backward Compatibility**
The mobile app is designed to work with both:
1. **New API responses** with copyId and detailed copy information
2. **Existing API responses** without copyId (graceful degradation)

### **Required Backend Changes**
1. **Book Details API**: Include `copies[]` array with copy details
2. **User Books API**: Include `copyId` in borrowed book objects
3. **Borrow/Return/Renew APIs**: Accept and validate `copyId` parameter

## 📱 **Files Modified**

### **Core Implementation**
- `app/book-catalog/details.jsx` - Copy selection UI and validation, reserve button
- `app/borrowing/borrow.jsx` - CopyId integration in borrow flow
- `app/borrowing/my-books.jsx` - CopyId support for return/renew
- `app/borrowing/reserve.jsx` - Updated reservation flow without condition assessment
- `services/ApiService.js` - Updated API calls with copyId
- `components/BookConditionsView.jsx` - New component for viewing book conditions

### **UI Components**
- Copy selection interface with visual feedback
- Selected copy display in borrow screen
- Validation messages for copy selection
- Error handling for missing copyId
- Book conditions view modal (read-only)
- Reserve button for unavailable books

## 🚀 **Ready for Production**

The mobile app is fully prepared for copy-level operations:
- ✅ Copy selection UI implemented
- ✅ API integration with copyId
- ✅ Error handling and validation
- ✅ Backward compatibility maintained
- ✅ User experience optimized

**Next Step**: Backend implementation of copyId support in API responses and validation.

---

**Mobile app copy selection implementation is complete!** 🎉

*Last Updated: January 2024*  
*Status: Production Ready*
