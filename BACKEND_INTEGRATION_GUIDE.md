# Backend Integration Guide for Library Mobile App

## Overview
This guide outlines the required backend API endpoints and data structures needed to connect the mobile app's book catalog and my-books functionality with the backend system.

## Required API Endpoints

### 1. Book Catalog API

#### GET /api/books
**Purpose**: Retrieve all available books with pagination and filtering
**Query Parameters**:
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of books per page (default: 20)
- `search` (optional): Search term for title, author, or subject
- `filterBy` (optional): Filter by 'title', 'author', 'subject', 'ddc', 'availability'
- `availability` (optional): Filter by 'available', 'unavailable', 'all'

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "books": [
      {
        "id": "string",
        "title": "string",
        "author": "string",
        "subject": "string",
        "ddc": "string",
        "location": "string",
        "availability": "string",
        "totalCopies": "number",
        "availableCopies": "number",
        "isbn": "string",
        "publicationYear": "number",
        "publisher": "string",
        "description": "string",
        "coverImage": "string (URL or base64)",
        "createdAt": "datetime",
        "updatedAt": "datetime"
      }
    ],
    "pagination": {
      "currentPage": "number",
      "totalPages": "number",
      "totalBooks": "number",
      "hasNext": "boolean",
      "hasPrev": "boolean"
    }
  }
}
```

#### GET /api/books/:id
**Purpose**: Retrieve detailed information about a specific book
**Response**: Same book object structure as above

#### GET /api/books/search
**Purpose**: Advanced search with multiple criteria
**Query Parameters**:
- `q`: Search query
- `filters`: JSON object with multiple filter criteria
- `sortBy`: Sort field (title, author, publicationYear, etc.)
- `sortOrder`: 'asc' or 'desc'

### 2. My Books API

#### GET /api/users/:userId/books
**Purpose**: Retrieve all books borrowed by a specific user
**Headers**: Authorization token required
**Query Parameters**:
- `status`: Filter by 'borrowed', 'returned', 'overdue', 'all'
- `includeHistory`: Boolean to include returned books history

**Response Structure**:
```json
{
  "success": true,
  "data": {
    "borrowedBooks": [
      {
        "id": "string",
        "bookId": "string",
        "bookTitle": "string",
        "bookAuthor": "string",
        "bookCover": "string",
        "borrowDate": "datetime",
        "dueDate": "datetime",
        "returnDate": "datetime",
        "status": "string (borrowed, returned, overdue)",
        "daysRemaining": "number",
        "isOverdue": "boolean",
        "fineAmount": "number",
        "fineStatus": "string (none, pending, paid)",
        "renewalCount": "number",
        "maxRenewals": "number"
      }
    ],
    "returnedBooks": [
      // Same structure as above but with returnDate filled
    ],
    "overdueBooks": [
      // Same structure as above but with isOverdue: true
    ]
  }
}
```

#### POST /api/users/:userId/books/:bookId/borrow
**Purpose**: Borrow a book
**Headers**: Authorization token required
**Body**:
```json
{
  "expectedReturnDate": "datetime (optional, calculated automatically if not provided)"
}
```

#### POST /api/users/:userId/books/:bookId/return
**Purpose**: Return a borrowed book
**Headers**: Authorization token required
**Body**:
```json
{
  "returnDate": "datetime (optional, uses current time if not provided)",
  "condition": "string (good, damaged, lost)",
  "notes": "string (optional)"
}
```

#### POST /api/users/:userId/books/:bookId/renew
**Purpose**: Renew a borrowed book
**Headers**: Authorization token required
**Response**: Updated book object with new due date

#### POST /api/users/:userId/books/:bookId/report
**Purpose**: Report a book as lost or damaged
**Headers**: Authorization token required
**Body**:
```json
{
  "reportType": "string (lost, damaged)",
  "description": "string",
  "incidentDate": "datetime (optional)"
}
```

### 3. Authentication & User Management

#### POST /api/auth/login
**Purpose**: User login
**Body**:
```json
{
  "email": "string",
  "password": "string"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "string (JWT token)",
    "user": {
      "id": "string",
      "email": "string",
      "role": "string",
      "fullName": "string",
      "status": "string"
    }
  }
}
```

#### GET /api/auth/me
**Purpose**: Get current user information
**Headers**: Authorization token required

## Database Schema Requirements

### Books Table
```sql
CREATE TABLE books (
  id VARCHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  ddc VARCHAR(50),
  location VARCHAR(100),
  isbn VARCHAR(20),
  publication_year INT,
  publisher VARCHAR(255),
  description TEXT,
  cover_image TEXT,
  total_copies INT DEFAULT 1,
  available_copies INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Book Copies Table
```sql
CREATE TABLE book_copies (
  id VARCHAR(36) PRIMARY KEY,
  book_id VARCHAR(36) NOT NULL,
  copy_number VARCHAR(50),
  status ENUM('available', 'borrowed', 'maintenance', 'lost') DEFAULT 'available',
  condition ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id)
);
```

### Borrowings Table
```sql
CREATE TABLE borrowings (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  book_copy_id VARCHAR(36) NOT NULL,
  borrow_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP NOT NULL,
  return_date TIMESTAMP NULL,
  status ENUM('borrowed', 'returned', 'overdue') DEFAULT 'borrowed',
  renewal_count INT DEFAULT 0,
  max_renewals INT DEFAULT 2,
  fine_amount DECIMAL(10,2) DEFAULT 0.00,
  fine_status ENUM('none', 'pending', 'paid') DEFAULT 'none',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_copy_id) REFERENCES book_copies(id)
);
```

### Reports Table
```json
CREATE TABLE reports (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  book_copy_id VARCHAR(36) NOT NULL,
  report_type ENUM('lost', 'damaged') NOT NULL,
  description TEXT,
  incident_date TIMESTAMP,
  status ENUM('pending', 'resolved') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (book_copy_id) REFERENCES book_copies(id)
);
```

## Implementation Notes

### 1. Authentication
- Implement JWT token-based authentication
- Include user role-based access control
- Validate tokens on protected endpoints

### 2. Error Handling
- Return consistent error response format:
```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object (optional)"
  }
}
```

### 3. Pagination
- Implement cursor-based or offset-based pagination
- Include metadata about total count and page information

### 4. Search & Filtering
- Implement full-text search for book titles and authors
- Support multiple filter combinations
- Use database indexes for optimal performance

### 5. Data Validation
- Validate all input data
- Sanitize search queries to prevent SQL injection
- Implement rate limiting for API endpoints

### 6. Performance Considerations
- Use database indexes on frequently searched fields
- Implement caching for book catalog data
- Use pagination to limit data transfer
- Consider implementing Elasticsearch for advanced search

## Testing Requirements

### 1. Unit Tests
- Test all API endpoints with valid and invalid data
- Test authentication and authorization
- Test error handling scenarios

### 2. Integration Tests
- Test complete user workflows (borrow, return, renew)
- Test search and filtering functionality
- Test pagination and sorting

### 3. Performance Tests
- Test API response times under load
- Test search performance with large datasets
- Test concurrent user scenarios

## Security Considerations

1. **Input Validation**: Validate and sanitize all user inputs
2. **SQL Injection**: Use parameterized queries
3. **Authentication**: Implement secure JWT token handling
4. **Authorization**: Check user permissions for all operations
5. **Rate Limiting**: Prevent API abuse
6. **Data Encryption**: Encrypt sensitive user data
7. **CORS**: Configure proper CORS policies for mobile app

## Deployment Notes

1. **Environment Variables**: Use environment variables for sensitive configuration
2. **Database**: Ensure proper database connection pooling
3. **Monitoring**: Implement logging and monitoring for API endpoints
4. **Backup**: Regular database backups
5. **SSL**: Use HTTPS for all API communications

## Contact Information

For questions or clarifications about this integration guide, please contact the mobile app development team.
