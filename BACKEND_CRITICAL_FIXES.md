# 🚨 **CRITICAL: Backend Fixes Required for Book Catalog**

## **Current Issues Causing Book Catalog Errors**

The mobile app book catalog is failing due to several backend configuration issues. Here are the **CRITICAL FIXES** needed:

---

## 🔥 **PRIORITY 1: CORS Configuration (URGENT)**

### **Problem**
```
❌ CORS ERROR DETECTED!
📋 Backend team needs to configure CORS to allow localhost:8081
```

### **Solution Required**
```javascript
// In your backend CORS configuration, add:
const corsOptions = {
  origin: [
    'http://localhost:8081',    // Expo development server
    'http://localhost:19006',   // Expo web
    'http://localhost:3000',    // Alternative dev port
    'https://your-app-domain.com' // Production domain
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
```

### **Test CORS Fix**
```bash
# Test from browser console:
fetch('https://kcmi-library-system.vercel.app/api/books?limit=1')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

---

## 🔥 **PRIORITY 2: Books API Endpoint Issues**

### **Problem**
The `/api/books` endpoint is not handling the `availability` parameter correctly.

### **Current API Call**
```http
GET /api/books?availability=available&limit=1000&search=math
```

### **Required Backend Changes**

#### **1. Add `availability` Parameter Support**
```javascript
// In your books API endpoint, add:
app.get('/api/books', async (req, res) => {
  const { availability, search, filterBy, limit, page } = req.query;
  
  let query = {};
  
  // Handle availability filter
  if (availability === 'available') {
    query.availableCopies = { $gt: 0 }; // Books with available copies
  } else if (availability === 'borrowed') {
    query.availableCopies = { $lt: db.collection('books').totalCopies }; // Books with borrowed copies
  }
  
  // Handle search
  if (search) {
    if (filterBy === 'title') {
      query.title = { $regex: search, $options: 'i' };
    } else if (filterBy === 'author') {
      query.author = { $regex: search, $options: 'i' };
    } else if (filterBy === 'subject') {
      query.subject = { $regex: search, $options: 'i' };
    } else if (filterBy === 'ddc') {
      query.ddc = { $regex: search, $options: 'i' };
    } else {
      // Search all fields
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { ddc: { $regex: search, $options: 'i' } }
      ];
    }
  }
  
  const books = await db.collection('books').find(query).limit(parseInt(limit) || 100).toArray();
  
  res.json({
    success: true,
    data: {
      books: books,
      pagination: {
        currentPage: parseInt(page) || 1,
        totalPages: Math.ceil(books.length / (parseInt(limit) || 100)),
        totalBooks: books.length,
        hasNext: false,
        hasPrev: false
      }
    }
  });
});
```

#### **2. Ensure Proper Response Format**
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "book-math-senior-006",
        "title": "Senior High Mathematics",
        "author": "John Smith",
        "subject": "Mathematics",
        "ddc": "510",
        "isbn": "978-1234567890",
        "shelfLocationPrefix": "Fi/senH",
        "location": "Library",
        "courseProgram": "Senior High",
        "program": "STEM",
        "availableCopies": 2,
        "totalCopies": 5,
        "condition": "GOOD"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalBooks": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

## 🔥 **PRIORITY 3: Missing API Endpoint**

### **Problem**
The mobile app needs to get actual book copies, but this endpoint is missing:

### **Required Endpoint**
```http
GET /api/books/{bookId}/copies
```

### **Implementation Required**
```javascript
app.get('/api/books/:bookId/copies', async (req, res) => {
  const { bookId } = req.params;
  
  try {
    const copies = await db.collection('book_copies').find({ 
      bookId: bookId,
      status: 'available' 
    }).toArray();
    
    res.json({
      success: true,
      data: {
        book: { id: bookId },
        copies: copies,
        totalCopies: copies.length,
        availableCopies: copies.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'COPY_FETCH_ERROR',
        message: 'Failed to fetch book copies'
      }
    });
  }
});
```

### **Expected Response**
```json
{
  "success": true,
  "data": {
    "book": { "id": "book-math-senior-006" },
    "copies": [
      {
        "id": "copy_123",
        "bookId": "book-math-senior-006",
        "copyNumber": "Copy 1",
        "status": "available",
        "shelfLocation": "Fi/senH",
        "condition": "GOOD"
      }
    ],
    "totalCopies": 1,
    "availableCopies": 1
  }
}
```

---

## 🔥 **PRIORITY 4: Error Handling Improvements**

### **Problem**
Backend is returning HTML error pages instead of JSON for API errors.

### **Solution Required**
```javascript
// Add global error handler for API routes
app.use('/api/*', (err, req, res, next) => {
  console.error('API Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An error occurred',
      type: 'API_ERROR'
    }
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ENDPOINT_NOT_FOUND',
      message: `API endpoint ${req.method} ${req.path} not found`,
      type: 'API_ERROR'
    }
  });
});
```

---

## 🧪 **Testing Checklist**

### **1. Test CORS Fix**
```bash
# Open browser console and run:
fetch('https://kcmi-library-system.vercel.app/api/books?limit=1')
  .then(r => r.json())
  .then(data => console.log('✅ CORS Fixed:', data))
  .catch(err => console.error('❌ CORS Still Broken:', err))
```

### **2. Test Books API**
```bash
# Test available books:
curl "https://kcmi-library-system.vercel.app/api/books?availability=available&limit=5"

# Test search:
curl "https://kcmi-library-system.vercel.app/api/books?search=math&filterBy=title"

# Test borrowed books:
curl "https://kcmi-library-system.vercel.app/api/books?availability=borrowed&limit=5"
```

### **3. Test Copies API**
```bash
# Test book copies:
curl "https://kcmi-library-system.vercel.app/api/books/book-math-senior-006/copies"
```

---

## 📱 **Mobile App Status**

### **What We've Fixed**
- ✅ Enhanced error handling with fallback mechanisms
- ✅ Better CORS error detection and user messaging
- ✅ Improved API response parsing
- ✅ Added debug tools for testing

### **What We Need from Backend**
- 🔥 **CORS configuration** (allows localhost:8081)
- 🔥 **Books API with availability parameter**
- 🔥 **Book copies API endpoint**
- 🔥 **Proper JSON error responses**

---

## ⚡ **Implementation Priority**

1. **IMMEDIATE**: Fix CORS configuration
2. **URGENT**: Add availability parameter to books API
3. **HIGH**: Implement book copies API endpoint
4. **MEDIUM**: Improve error handling

---

## 📞 **Contact**

Once these fixes are implemented, please let us know so we can test the mobile app functionality.

**Expected Result**: Book catalog will load properly, search will work, and users can view and borrow books without errors.

---

**Status**: 🚨 **CRITICAL - Backend team action required immediately**
