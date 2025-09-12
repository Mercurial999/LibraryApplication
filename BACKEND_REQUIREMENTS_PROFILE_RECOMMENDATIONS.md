# Backend Requirements for Profile & Recommendations

## 1. Profile Image Display Requirements

### Current Issue
- Profile images are not showing in sidebar and account settings
- Backend profile API is not returning the `studentPhoto` field properly

### Required Backend Changes

#### A. Update Profile API Endpoint
**File**: `kcmi-library-system/src/app/api/mobile/users/[id]/profile/route.ts`

**Current Response Structure** (from terminal logs):
```json
{
  "success": true,
  "data": {
    "display": {
      "fullName": "Davie Villar",
      "role": "TEACHER"
    },
    "email": "jadelawrencea@gmail.com",
    "firstName": "Davie",
    "lastName": "Villar",
    "teacherInfo": {
      "department": "Social Studies",
      "employeeId": "user_1757136413169_i5j8zi"
    },
    "qrCodeData": {...},
    "qrCodeImage": "data:image/png;base64,..."
  }
}
```

**Required Response Structure**:
```json
{
  "success": true,
  "data": {
    "id": "user_1757136413169_i5j8zi",
    "firstName": "Davie",
    "lastName": "Villar",
    "fullName": "Davie Villar",
    "email": "jadelawrencea@gmail.com",
    "role": "TEACHER",
    "status": "ACTIVE",
    "profileImage": "https://cloudinary-url/student-photo.jpg", // CRITICAL: This field is missing
    "studentPhoto": "https://cloudinary-url/student-photo.jpg", // Alternative field name
    "qrCodeData": {...},
    "qrCodeImage": "data:image/png;base64,...",
    "teacherInfo": {
      "department": "Social Studies",
      "employeeId": "user_1757136413169_i5j8zi"
    }
  }
}
```

#### B. Database Query Update
**Required**: Ensure the profile API includes `studentPhoto` in the SELECT query:

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    role: true,
    status: true,
    studentPhoto: true, // CRITICAL: This field must be included
    // ... other fields
  },
});
```

#### C. Response Mapping
**Required**: Map `studentPhoto` to `profileImage` in the response:

```typescript
return NextResponse.json({
  success: true,
  data: {
    ...user,
    profileImage: user.studentPhoto, // Map studentPhoto to profileImage
    fullName: `${user.firstName} ${user.lastName}`,
    // ... other fields
  }
});
```

## 2. Recommendations System Requirements

### Current Issue
- No backend recommendations endpoint exists
- Frontend is calling non-existent API

### Required Backend Implementation

#### A. Create Recommendations API Endpoint
**File**: `kcmi-library-system/src/app/api/mobile/users/[id]/recommendations/route.ts`

**Endpoint**: `GET /api/mobile/users/[id]/recommendations`

**Required Response Structure**:
```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "id": "book_123",
        "title": "Advanced Mathematics",
        "author": "John Smith",
        "category": "Mathematics",
        "publisher": "Academic Press",
        "subject": "Calculus",
        "shelfLocation": "A-1-2",
        "ddcClassification": "510.2",
        "publicationYear": 2023,
        "availableCopies": 3,
        "totalCopies": 5,
        "isbn": "978-1234567890",
        "description": "Comprehensive guide to advanced mathematics",
        "recommendationScore": 15,
        "recommendationType": "Highly Recommended",
        "recommendationReasons": [
          "Similar to your favorite category: Mathematics",
          "From your preferred publisher: Academic Press",
          "Currently available"
        ]
      }
    ],
    "preferences": {
      "topCategories": [
        {"category": "Mathematics", "count": 5},
        {"category": "Science", "count": 3}
      ],
      "topAuthors": [
        {"author": "John Smith", "count": 4},
        {"author": "Jane Doe", "count": 2}
      ],
      "topPublishers": [
        {"publisher": "Academic Press", "count": 3}
      ],
      "topSubjects": [
        {"subject": "Calculus", "count": 2}
      ],
      "topShelfLocations": [
        {"location": "A-1-2", "count": 4}
      ],
      "topDdcPrefixes": [
        {"ddc": "510", "count": 3}
      ],
      "readingStats": {
        "totalBooksBorrowed": 12,
        "averageBorrowDuration": 14,
        "seasonalPatterns": {
          "Spring": 3,
          "Summer": 5,
          "Fall": 2,
          "Winter": 2
        }
      }
    },
    "analysis": {
      "totalBooksAnalyzed": 150,
      "userHistoryCount": 12,
      "recommendationCount": 20,
      "lastUpdated": "2025-01-11T21:42:29.000Z"
    }
  }
}
```

#### B. Database Requirements
**Required Tables & Fields**:

1. **User Table**:
   - `studentPhoto` (VARCHAR) - Cloudinary URL for profile image
   - `id`, `firstName`, `lastName`, `email`, `role`, `status`

2. **Book Table**:
   - `id`, `title`, `author`, `category`, `publisher`, `subject`
   - `shelfLocation`, `ddcClassification`, `publicationYear`
   - `availableCopies`, `totalCopies`, `isbn`, `description`
   - `status` (ACTIVE/INACTIVE)

3. **BorrowTransaction Table**:
   - `id`, `userId`, `bookId`, `borrowedAt`, `returnedAt`
   - `status` (BORROWED/RETURNED/OVERDUE)

#### C. Recommendation Algorithm Requirements
**Required Logic**:

1. **User History Analysis**:
   - Get last 50 borrowing transactions
   - Analyze categories, authors, publishers, subjects
   - Calculate reading patterns and preferences

2. **Book Scoring System**:
   - Category match: +10 points
   - Author match: +8 points
   - Publisher match: +5 points
   - Subject match: +6 points
   - Shelf location match: +3 points
   - DDC classification match: +2 points
   - Availability bonus: +1 point
   - Recency bonus: +1 point (books ≤5 years old)

3. **Recommendation Types**:
   - Highly Recommended: Score ≥15
   - Strong Match: Score ≥10
   - Good Match: Score ≥5
   - Suggested: Score >0

4. **Filtering Rules**:
   - Exclude already borrowed books
   - Only include ACTIVE books
   - Prioritize available copies
   - Limit to top 20 recommendations

## 3. Implementation Priority

### High Priority (Critical)
1. **Fix Profile API**: Add `studentPhoto` field to profile response
2. **Create Recommendations API**: Implement the recommendations endpoint
3. **Database Queries**: Ensure proper field selection and mapping

### Medium Priority
1. **Error Handling**: Proper error responses for missing data
2. **Performance**: Optimize database queries for recommendations
3. **Caching**: Consider caching for frequently accessed data

### Low Priority
1. **Analytics**: Enhanced user behavior tracking
2. **A/B Testing**: Recommendation algorithm improvements
3. **Machine Learning**: Future AI-powered recommendations

## 4. Testing Requirements

### Profile API Testing
- [ ] Verify `studentPhoto` field is returned
- [ ] Test with users who have profile images
- [ ] Test with users who don't have profile images
- [ ] Verify image URLs are valid Cloudinary URLs

### Recommendations API Testing
- [ ] Test with users who have borrowing history
- [ ] Test with new users (no history)
- [ ] Verify recommendation scoring logic
- [ ] Test recommendation filtering and sorting
- [ ] Verify response structure matches requirements

## 5. Error Handling

### Profile API Errors
```json
{
  "success": false,
  "message": "User not found",
  "error": "USER_NOT_FOUND"
}
```

### Recommendations API Errors
```json
{
  "success": false,
  "message": "Failed to generate recommendations",
  "error": "RECOMMENDATION_ERROR"
}
```

## 6. Authentication Requirements

Both APIs must:
- Verify JWT token in Authorization header
- Check user permissions (own profile or admin)
- Return 401 for invalid tokens
- Return 403 for insufficient permissions

---

**Note**: The frontend is already implemented and ready to consume these APIs. Once the backend is updated according to these requirements, the profile images will display correctly and the recommendations system will work as designed.
