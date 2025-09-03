# Backend Handoff: Enhanced Book Inventory System (Mobile App)

This guide documents the enhanced book inventory system implementation in the mobile app, including shelf location integration, course programs, and borrowable status.

**Reference base URL:** `https://kcmi-library-system.vercel.app`

---

## 🎯 **Overview**

The mobile app has been enhanced to support the Kings College of Marbel library catalog structure with new fields for:
- **Shelf Location Prefixes** (Fi, Fi/HS, Fi/E, Fi/K, Fi/senH)
- **Course Programs** (BEED, BSED)
- **Borrowable Status** (Borrowable vs Reference Only)
- **Enhanced Call Numbers** (combining all components)

---

## 🔧 **Mobile App Changes Made**

### **1. Enhanced Book Model (`bookModels/book.jsx`)**

- **New Fields Added:**
  - `shelfLocationPrefix`: Shelf location prefix (default: "Fi")
  - `courseProgram`: Course program (nullable)
  - `isBorrowable`: Borrowable status (default: true)
  - `callNumber`: Individual call number
  - `year`: Publication year

- **Computed Fields:**
  - `fullCallNumber`: Generated from all components
  - `displayStatus`: Smart status display

- **Helper Methods:**
  - `getShelfLocationDisplay()`: Human-readable location names
  - `getCourseProgramDisplay()`: Full program names
  - `isAvailableForBorrow()`: Smart availability check

### **2. Enhanced Book Catalog (`/book-catalog/index.jsx`)**

- **New Display Elements:**
  - Shelf location badges with color coding
  - Borrowable/Reference status badges
  - Course program information
  - Full call number display

- **Enhanced Filtering:**
  - Shelf location filter (Fi, Fi/HS, Fi/E, Fi/K, Fi/senH)
  - Course program filter (BEED, BSED, All Programs)
  - Real-time filtering with visual feedback

- **Visual Enhancements:**
  - Color-coded badges for different statuses
  - Monospace font for call numbers
  - Responsive filter layout

### **3. Enhanced Book Details (`/book-catalog/details.jsx`)**

- **Additional Information Display:**
  - Shelf location with human-readable names
  - Course program details
  - Borrowable status with visual indicators
  - Full call number breakdown

- **Enhanced UI Components:**
  - Status badges with appropriate colors
  - Call number display with monospace formatting
  - Integrated location and program information

---

## 📱 **Required Backend API Updates**

### **1. Book Catalog Endpoint**

**Current:** `GET /api/mobile/books`
**Enhanced Response Required:**

```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "book_123",
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "subject": "Fiction",
        "ddc": "813.52",
        "shelfLocation": "A-1-01",
        
        // NEW ENHANCED FIELDS
        "shelfLocationPrefix": "Fi/HS",
        "courseProgram": "BEED",
        "isBorrowable": true,
        "callNumber": "GAT-001",
        "year": 1925,
        
        // Existing fields
        "availableCopies": 2,
        "totalCopies": 3,
        "coverImage": "https://...",
        "copies": [...]
      }
    ]
  }
}
```

### **2. Book Details Endpoint**

**Current:** `GET /api/mobile/books/:bookId`
**Enhanced Response Required:**

```json
{
  "success": true,
  "data": {
    "id": "book_123",
    "title": "The Great Gatsby",
    "author": "F. Scott Fitzgerald",
    "subject": "Fiction",
    "ddc": "813.52",
    "shelfLocation": "A-1-01",
    
    // NEW ENHANCED FIELDS
    "shelfLocationPrefix": "Fi/HS",
    "courseProgram": "BEED",
    "isBorrowable": true,
    "callNumber": "GAT-001",
    "year": 1925,
    
    // Existing fields
    "availableCopies": 2,
    "totalCopies": 3,
    "copies": [...],
    "conditionHistory": [...]
  }
}
```

---

## 🎨 **Shelf Location System**

### **Supported Locations:**

```javascript
const SHELF_LOCATIONS = [
  { id: "Fi", name: "College", description: "College collection" },
  { id: "Fi/senH", name: "Senior High School", description: "Senior High School collection" },
  { id: "Fi/HS", name: "High School", description: "High School collection" },
  { id: "Fi/E", name: "Elementary", description: "Elementary collection" },
  { id: "Fi/K", name: "Kindergarten", description: "Kindergarten collection" }
];
```

### **Course Programs:**

```javascript
const COURSE_PROGRAMS = [
  { id: "BEED", name: "Bachelor of Elementary Education" },
  { id: "BSED", name: "Bachelor of Secondary Education" }
];
```

---

## 🔍 **Enhanced Search & Filtering**

### **New Filter Parameters:**

The mobile app now supports enhanced filtering:

```javascript
// Shelf Location Filter
const shelfLocationFilter = "Fi/HS"; // Filter by specific location

// Course Program Filter  
const courseProgramFilter = "BEED"; // Filter by specific program

// Borrowable Status Filter
const borrowableFilter = true; // Only show borrowable books
```

### **Backend Implementation:**

```javascript
// Example filter logic
const filterBooks = (books, filters) => {
  let filtered = [...books];
  
  if (filters.shelfLocation) {
    filtered = filtered.filter(book => 
      book.shelfLocationPrefix === filters.shelfLocation
    );
  }
  
  if (filters.courseProgram) {
    filtered = filtered.filter(book => 
      book.courseProgram === filters.courseProgram
    );
  }
  
  if (filters.borrowable !== undefined) {
    filtered = filtered.filter(book => 
      book.isBorrowable === filters.borrowable
    );
  }
  
  return filtered;
};
```

---

## 📊 **Data Structure Requirements**

### **Book Object Schema:**

```typescript
interface Book {
  // Existing fields
  id: string;
  title: string;
  author: string;
  subject: string;
  ddc: string;
  shelfLocation: string;
  availableCopies: number;
  totalCopies: number;
  coverImage?: string;
  
  // NEW ENHANCED FIELDS
  shelfLocationPrefix: string; // "Fi", "Fi/HS", "Fi/E", "Fi/K", "Fi/senH"
  courseProgram?: string; // "BEED", "BSED", or null
  isBorrowable: boolean; // true for borrowable, false for reference
  callNumber?: string; // Individual call number
  year?: number; // Publication year
  
  // Computed fields (optional, can be generated on frontend)
  fullCallNumber?: string; // Combined call number
  displayStatus?: string; // Smart status display
}
```

---

## 🚀 **Implementation Checklist**

### **Backend Tasks:**

- [ ] **Update Book Schema:** Add new fields to database
- [ ] **API Response Updates:** Include new fields in book endpoints
- [ ] **Filter Implementation:** Add shelf location and course program filtering
- [ ] **Data Migration:** Update existing books with new field values
- [ ] **Validation:** Ensure new fields are properly validated

### **Mobile App Status:**

- [x] **Enhanced Book Model:** ✅ Complete
- [x] **Enhanced Catalog Display:** ✅ Complete  
- [x] **Enhanced Details Display:** ✅ Complete
- [x] **Enhanced Filtering:** ✅ Complete
- [x] **Enhanced Styling:** ✅ Complete

---

## 🔄 **Migration Strategy**

### **Phase 1: Backend Preparation (Week 1)**
1. Update database schema with new fields
2. Modify API endpoints to return new fields
3. Implement enhanced filtering logic
4. Test API responses

### **Phase 2: Data Migration (Week 2)**
1. Update existing books with default values
2. Assign appropriate shelf location prefixes
3. Set course programs where applicable
4. Mark reference books as non-borrowable

### **Phase 3: Testing & Validation (Week 3)**
1. Test enhanced filtering on mobile app
2. Verify all new fields display correctly
3. Test edge cases and error handling
4. Performance testing with large datasets

---

## ⚠️ **Important Notes**

### **Default Values:**
- **shelfLocationPrefix**: Defaults to "Fi" (College)
- **courseProgram**: Defaults to null (not specified)
- **isBorrowable**: Defaults to true (borrowable)
- **callNumber**: Defaults to empty string
- **year**: Defaults to current year

### **Backward Compatibility:**
- All existing book data will work with default values
- New fields are optional in API responses
- Mobile app gracefully handles missing fields

### **Performance Considerations:**
- Enhanced filtering may impact large datasets
- Consider indexing on new filter fields
- Implement pagination for filtered results if needed

---

## 🧪 **Testing Scenarios**

### **1. Basic Functionality:**
- [ ] Books display with new enhanced information
- [ ] Shelf location badges show correct colors
- [ ] Borrowable status displays correctly
- [ ] Course program information shows when available

### **2. Enhanced Filtering:**
- [ ] Shelf location filter works correctly
- [ ] Course program filter works correctly
- [ ] Filters can be combined
- [ ] Filter state persists during navigation

### **3. Edge Cases:**
- [ ] Books without new fields display with defaults
- [ ] Empty course programs handled gracefully
- [ ] Invalid shelf locations don't crash the app
- [ ] Filtering with no results shows appropriate message

---

## 📞 **Support & Questions**

If you encounter issues:

1. **Check this guide first** - most implementation details are covered
2. **Verify API responses** - ensure new fields are included
3. **Test with sample data** - use the provided examples
4. **Check mobile app logs** - look for missing field errors

---

## 🎯 **Success Metrics**

Your enhanced book inventory system is successful when:

- ✅ No runtime errors related to missing enhanced fields
- ✅ Enhanced information displays correctly in mobile app
- ✅ Enhanced filtering works as expected
- ✅ All existing functionality remains intact
- ✅ Performance is maintained with new features

---

**Last Updated:** 2025-08-27  
**Status:** Mobile App Complete - Awaiting Backend Implementation
