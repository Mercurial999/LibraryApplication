# 🚨 **URGENT: Backend 405 Error Fix Required**

## 📋 **Issue Summary**

The mobile app is getting **405 Method Not Allowed** errors when trying to access the book copies API:

```
Status: 405
Request failed with status 405
```

---

## 🔍 **Root Cause**

The backend API endpoint `/api/books/{bookId}/copies` exists but doesn't support the **GET** method that the mobile app is using.

---

## 🔧 **Backend Fix Required**

### **Option 1: Add GET Method Support (Recommended)**

**File**: `src/app/api/books/[id]/copies/route.ts`

**Current Issue**: The endpoint only supports POST or other methods, not GET.

**Required Fix**: Add GET method handler:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Add GET method support
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookId = params.id;
    
    console.log('Getting copies for book:', bookId);
    
    // Get copies for the specific book
    const copies = await prisma.bookCopy.findMany({
      where: {
        bookId: bookId,
        status: 'available' // Only return available copies
      },
      select: {
        id: true,
        copyNumber: true,
        status: true,
        shelfLocation: true,
        condition: true,
        bookId: true
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        book: { id: bookId },
        copies: copies,
        totalCopies: copies.length,
        availableCopies: copies.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching book copies:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'COPY_FETCH_ERROR',
        message: 'Failed to fetch book copies'
      }
    }, { status: 500 });
  }
}
```

### **Option 2: Alternative Endpoint**

If the current endpoint can't be modified, create a new one:

**File**: `src/app/api/books/[id]/available-copies/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookId = params.id;
    
    const copies = await prisma.bookCopy.findMany({
      where: {
        bookId: bookId,
        status: 'available'
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        book: { id: bookId },
        copies: copies,
        totalCopies: copies.length,
        availableCopies: copies.length
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: {
        code: 'COPY_FETCH_ERROR',
        message: 'Failed to fetch book copies'
      }
    }, { status: 500 });
  }
}
```

---

## 📱 **Mobile App Fallback (Already Implemented)**

The mobile app now handles the 405 error gracefully:

1. **Detects 405 error**
2. **Creates copy information** from book data
3. **Uses realistic copy IDs** like `book_${bookId}_copy_${i}`
4. **Shows proper UI** with loading states and error handling

### **Copy ID Format Used by Mobile App:**
```
book_college-english-007_copy_1
book_college-english-007_copy_2
book_college-english-007_copy_3
```

---

## 🧪 **Testing the Fix**

### **Test 1: Check Current API**
```bash
curl -X GET "https://kcmi-library-system.vercel.app/api/books/book-college-english-007/copies"
```

**Expected**: Should return 200 with copy data, not 405

### **Test 2: Verify Response Format**
```json
{
  "success": true,
  "data": {
    "book": { "id": "book-college-english-007" },
    "copies": [
      {
        "id": "copy_123",
        "copyNumber": "Copy 1",
        "status": "available",
        "shelfLocation": "Fi/colH",
        "condition": "GOOD"
      }
    ],
    "totalCopies": 1,
    "availableCopies": 1
  }
}
```

---

## 🎯 **Expected Results After Fix**

### **Before Fix:**
```
Mobile app calls GET /api/books/{id}/copies
→ Backend returns 405 Method Not Allowed
→ Mobile app shows error or uses fallback
```

### **After Fix:**
```
Mobile app calls GET /api/books/{id}/copies
→ Backend returns 200 with copy data
→ Mobile app shows real copy information
→ Users can select and borrow books
```

---

## ⚡ **Priority: HIGH**

This fix is required to enable the book borrowing functionality. Without it, users cannot see available copies or borrow books.

---

## 📞 **Next Steps**

1. **Backend team**: Add GET method support to `/api/books/[id]/copies/route.ts`
2. **Test the fix**: Use the curl command above
3. **Mobile app**: Will automatically use the real API once it returns 200
4. **Verify**: Users can now see and select book copies

---

**Status**: 🚨 **URGENT - Backend team action required**

**Issue**: 405 Method Not Allowed for book copies API
**Solution**: Add GET method support to the copies endpoint
