# 🐛 Backend Data Issues Fix Guide

## **Issue Identified: Multiple Book Copies Causing Duplicates**

### **Problem Description:**
The `/api/books` endpoint is returning duplicate books because each book has multiple copies, and the SQL query is creating one row per copy instead of aggregating them.

### **Root Cause:**
```
Book: "Physical Education 1" has 3 copies
├── Copy 1: Available
├── Copy 2: Borrowed  
└── Copy 3: Available

Current Query: SELECT b.*, bc.* FROM books b LEFT JOIN book_copies bc
Result: 3 rows for same book (one per copy) ❌
Expected: 1 row per book with aggregated copy counts ✅
```

### **Evidence from Frontend Logs:**
```
Books count: 3
Books: [
  {"id": "bk_1755311609939_qoz9tp", "title": "Physical Education 1"}, 
  {"id": "bk_1755311609939_qoz9tp", "title": "Physical Education 1"}, 
  {"id": "bk_1755311609939_qoz9tp", "title": "Physical Education 1"}
]
```

**Expected:** 1 book with total copies count
**Actual:** 3 duplicate rows (one per copy)

---

## 🔧 **Fix Instructions**

### **1. Use Aggregation Query (Recommended)**

**Current Query (PROBLEMATIC):**
```sql
SELECT b.*, bc.* 
FROM books b 
LEFT JOIN book_copies bc ON b.id = bc.book_id
```

**Fixed Query (use GROUP BY with aggregation):**
```sql
SELECT 
  b.id, b.title, b.author, b.subject, b.ddc, b.location,
  b.isbn, b.publication_year, b.publisher, b.description,
  b.created_at, b.updated_at,
  COUNT(bc.id) as total_copies,
  SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) as available_copies,
  CASE WHEN SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) > 0 
       THEN 'available' ELSE 'unavailable' END as availability
FROM books b 
LEFT JOIN book_copies bc ON b.id = bc.book_id
GROUP BY b.id, b.title, b.author, b.subject, b.ddc, b.location,
         b.isbn, b.publication_year, b.publisher, b.description,
         b.created_at, b.updated_at
ORDER BY b.title
```

### **2. Alternative: Use Subqueries (Also Good)**

```sql
SELECT 
  b.*,
  (SELECT COUNT(*) FROM book_copies WHERE book_id = b.id) as total_copies,
  (SELECT COUNT(*) FROM book_copies WHERE book_id = b.id AND status = 'available') as available_copies,
  CASE WHEN (SELECT COUNT(*) FROM book_copies WHERE book_id = b.id AND status = 'available') > 0 
       THEN 'available' ELSE 'unavailable' END as availability
FROM books b
ORDER BY b.title
```

### **3. Sequelize Fix (If using Sequelize ORM)**

```javascript
const getBooks = async (req, res) => {
  try {
    const books = await Book.findAll({
      attributes: {
        include: [
          [sequelize.fn('COUNT', sequelize.col('book_copies.id')), 'total_copies'],
          [sequelize.fn('SUM', 
            sequelize.literal("CASE WHEN book_copies.status = 'available' THEN 1 ELSE 0 END")
          ), 'available_copies'],
        ]
      },
      include: [{
        model: BookCopy,
        attributes: [], // Don't include copy details
        required: false
      }],
      group: ['Book.id'], // Group by book to avoid duplicates
      order: [['title', 'ASC']]
    });

    // Process the results
    const processedBooks = books.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      subject: book.subject,
      ddc: book.ddc,
      location: book.location,
      isbn: book.isbn,
      publicationYear: book.publication_year,
      publisher: book.publisher,
      description: book.description,
      totalCopies: parseInt(book.dataValues.total_copies) || 0,
      availableCopies: parseInt(book.dataValues.available_copies) || 0,
      availability: parseInt(book.dataValues.available_copies) > 0 ? 'available' : 'unavailable',
      createdAt: book.created_at,
      updatedAt: book.updated_at
    }));

    res.json({ 
      success: true, 
      data: { 
        books: processedBooks,
        pagination: {
          currentPage: parseInt(req.query.page) || 1,
          totalBooks: processedBooks.length,
          hasNext: false,
          hasPrev: false
        }
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

### **4. Raw SQL Fix (Node.js/Express)**

```javascript
const getBooks = async (req, res) => {
  try {
    const query = `
      SELECT 
        b.id, b.title, b.author, b.subject, b.ddc, b.location,
        b.isbn, b.publication_year, b.publisher, b.description,
        b.created_at, b.updated_at,
        COUNT(bc.id) as total_copies,
        SUM(CASE WHEN bc.status = 'available' THEN 1 ELSE 0 END) as available_copies
      FROM books b 
      LEFT JOIN book_copies bc ON b.id = bc.book_id
      GROUP BY b.id, b.title, b.author, b.subject, b.ddc, b.location,
               b.isbn, b.publication_year, b.publisher, b.description,
               b.created_at, b.updated_at
      ORDER BY b.title
    `;
    
    const [books] = await db.execute(query);
    
    const processedBooks = books.map(book => ({
      id: book.id,
      title: book.title,
      author: book.author,
      subject: book.subject,
      ddc: book.ddc,
      location: book.location,
      isbn: book.isbn,
      publicationYear: book.publication_year,
      publisher: book.publisher,
      description: book.description,
      totalCopies: parseInt(book.total_copies) || 0,
      availableCopies: parseInt(book.available_copies) || 0,
      availability: parseInt(book.available_copies) > 0 ? 'available' : 'unavailable',
      createdAt: book.created_at,
      updatedAt: book.updated_at
    }));

    res.json({ 
      success: true, 
      data: { 
        books: processedBooks,
        pagination: {
          currentPage: parseInt(req.query.page) || 1,
          totalBooks: processedBooks.length,
          hasNext: false,
          hasPrev: false
        }
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## 🧪 **Testing Instructions**

### **1. Test the API Endpoint**

```bash
curl -X GET "https://your-backend-url/api/books" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### **2. Expected Response Format**

```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "bk_1755311609939_qoz9tp",
        "title": "Physical Education 1",
        "author": "Jhonny Depp, Super Man",
        "subject": "Business",
        "ddc": "003.2",
        "location": "CS-0012",
        "isbn": "1-111-11111-2",
        "publicationYear": 2023,
        "publisher": "Heneral Lune",
        "description": "Physical Education 1",
        "totalCopies": 3,
        "availableCopies": 2,
        "availability": "available",
        "createdAt": "2025-08-16T02:33:30.189Z",
        "updatedAt": "2025-08-16T02:33:30.189Z"
      },
      {
        "id": "book_003",
        "title": "MAPEH 1",
        "author": "Different Author",
        "subject": "Arts",
        "ddc": "700.1",
        "location": "CS-0013",
        "isbn": "1-111-11111-3",
        "publicationYear": 2023,
        "publisher": "Different Publisher",
        "description": "MAPEH 1 Description",
        "totalCopies": 2,
        "availableCopies": 1,
        "availability": "available",
        "createdAt": "2025-08-16T02:33:30.189Z",
        "updatedAt": "2025-08-16T02:33:30.189Z"
      }
      // ... more unique books
    ],
    "pagination": {
      "currentPage": 1,
      "totalBooks": 5,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

### **3. Validation Checklist**

- [ ] **No duplicate IDs**: Each book appears only once
- [ ] **Correct copy counts**: `totalCopies` shows total number of copies
- [ ] **Correct available counts**: `availableCopies` shows available copies
- [ ] **Proper availability**: `availability` field matches `availableCopies > 0`
- [ ] **All books present**: Response contains all unique books from database

---

## 🚨 **Key Points**

1. **Use `GROUP BY`** to aggregate copies per book
2. **Use `COUNT()`** for total copies
3. **Use `SUM(CASE WHEN...)`** for available copies
4. **Don't include copy details** in the main query
5. **Group by all book fields** to avoid SQL errors

---

## 📞 **After Fixing**

Once you've implemented the fix:

1. **Test the endpoint** with the curl command above
2. **Verify one row per book** with correct copy counts
3. **Check frontend logs** - should show unique books
4. **Remove frontend deduplication** - no longer needed

The frontend will automatically work correctly once the backend returns one row per book with aggregated copy counts!

---

## 🔗 **Related Files**

- **Frontend**: `LibraryApplication/app/book-catalog/index.jsx`
- **API Service**: `LibraryApplication/services/ApiService.js`
- **Backend Guide**: `LibraryApplication/BACKEND_INTEGRATION_GUIDE.md`

---

**Priority: HIGH** - This is blocking proper frontend functionality due to multiple copies creating duplicate rows.
