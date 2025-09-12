## Mobile Reservations Backend Guide (Current Implementation)

This guide documents the reservation-related API endpoints exactly as implemented in the codebase today. It is tailored for the mobile app and the reservation review module (approve/reject with notes).

### Auth & CORS

- **Auth**: `Authorization: Bearer <token>` is explicitly validated on `GET /api/mobile/books/:bookId`. Other endpoints currently do not enforce this check server-side.
- **CORS**: Explicit CORS headers are applied in `GET /api/mobile/books/:bookId`. Other endpoints use default Next.js behavior.

---

## Mobile Endpoints

### 1) Create Reservation

POST `/api/mobile/users/:userId/books/:bookId/reserve`

Request body:

```json
{
  "expectedReturnDate": "2025-10-11T00:00:00.000Z",
  "initialCondition": "EXCELLENT|GOOD|FAIR|POOR|DAMAGED" (optional),
  "conditionNotes": "string" (optional)
}
```

Success 200:

```json
{
  "success": true,
  "message": "Book reserved successfully",
  "data": {
    "reservationId": "res_xxx",
    "bookId": "book_abc",
    "userId": "user_123",
    "reservationDate": "2025-09-11T12:00:00.000Z",
    "expectedReturnDate": "2025-10-11T00:00:00.000Z",
    "status": "ACTIVE",
    "initialCondition": "GOOD|null",
    "conditionNotes": "string|null"
  }
}
```

Failure responses (selected):

- 400 `MISSING_REQUIRED_FIELD` (missing `expectedReturnDate`)
- 400 `INVALID_CONDITION_VALUE` (invalid `initialCondition`)
- 404 `USER_NOT_FOUND` | 403 `USER_INACTIVE`
- 404 `BOOK_NOT_FOUND`
- 400 `BOOK_AVAILABLE` (rule: current check is `book.availableCopies >= book.totalCopies`)
- 400 `DUPLICATE_RESERVATION` (existing with status in `ACTIVE|READY`)
- 400 `OVERDUE_BOOKS`
- 400 `ALREADY_BORROWED`
- 500 `INTERNAL_ERROR`

Notes:

- Creation status is `ACTIVE` (not `PENDING`).
- Response does not contain `copyId`.

Source: `src/app/api/mobile/users/[id]/books/[bookId]/reserve/route.ts`

---

### 2) List User Reservations

GET `/api/mobile/users/:userId/reservations?status=all|<STATUS>`

Success 200:

```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "id": "res_xxx",
        "bookId": "book_abc",
        "bookTitle": "...",
        "bookAuthor": "...",
        "bookCover": "",
        "status": "ACTIVE|READY|CANCELLED|FULFILLED|...",
        "reservationDate": "2025-09-11T12:00:00.000Z",
        "expectedReturnDate": "2025-10-11T00:00:00.000Z",
        "daysUntilExpected": 15,
        "isExpired": false,
        "initialCondition": "GOOD|null",
        "conditionNotes": "string|null",
        "fulfilledDate": null,
        "cancelledDate": null,
        "cancelledReason": null
      }
    ]
  }
}
```

Failure responses:

- 404 `USER_NOT_FOUND`
- 500 `INTERNAL_ERROR`

Notes:

- `status` filter is case-insensitive; `all` (default) returns all.
- Items do not include `copyId`.

Source: `src/app/api/mobile/users/[id]/reservations/route.ts`

---

### 3) Cancel Reservation (User)

DELETE `/api/mobile/users/:userId/reservations/:reservationId`

Request body:

```json
{ "reason": "No longer needed" }
```

Success 200:

```json
{
  "success": true,
  "message": "Reservation cancelled successfully",
  "data": {
    "reservationId": "res_xxx",
    "status": "CANCELLED",
    "cancelledDate": "2025-09-11T12:30:00.000Z",
    "cancelledReason": "No longer needed"
  }
}
```

Failure responses:

- 404 `USER_NOT_FOUND` | 404 `RESERVATION_NOT_FOUND`
- 400 `RESERVATION_FULFILLED` | 400 `RESERVATION_ALREADY_CANCELLED`
- 500 `INTERNAL_ERROR`

Notes:

- If the reservation has a linked `bookCopyId`, cancellation releases that copy.

Source: `src/app/api/mobile/users/[id]/reservations/[reservationId]/route.ts`

---

## Reservation Review Module (Admin/Staff)

These endpoints power the reservation review queue and processing (approve/reject with notes).

### 4) List Reservations (Admin)

GET `/api/book-reservations?status=<STATUS|all>&userId=<id>&bookId=<id>&page=1&limit=50&search=...`

Success 200 (paginated):

```json
{
  "reservations": [
    {
      "id": "res_xxx",
      "borrowerId": "user_123",
      "borrowerName": "Jane Doe",
      "borrowerEmail": "jane@example.com",
      "borrowerRole": "STUDENT",
      "bookTitle": "...",
      "bookAuthor": "...",
      "bookId": "book_abc",
      "bookIsbn": "...",
      "bookAvailableCopies": 0,
      "bookTotalCopies": 3,
      "reservationDate": "2025-09-11T12:00:00.000Z",
      "expiryDate": "2025-09-18T12:00:00.000Z",
      "status": "ACTIVE|READY|CANCELLED|...",
      "priority": 1,
      "notificationsSent": 0,
      "notes": null
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "totalPages": 1
}
```

Source: `src/app/api/book-reservations/route.ts` (GET)

---

### 5) Get Reservation by ID (Admin)

GET `/api/book-reservations/:id`

Success 200:

```json
{
  "id": "res_xxx",
  "user": {
    "id": "user_123",
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "role": "STUDENT"
  },
  "book": {
    "id": "book_abc",
    "title": "...",
    "author": "...",
    "isbn": "...",
    "availableCopies": 0,
    "totalCopies": 3
  },
  "status": "ACTIVE|READY|...",
  "reservationDate": "2025-09-11T12:00:00.000Z",
  "expiryDate": "2025-09-18T12:00:00.000Z",
  "notes": null
}
```

404 if not found.

Source: `src/app/api/book-reservations/[id]/route.ts` (GET)

---

### 6) Update Reservation by ID (Approve/Reject with Notes)

PATCH `/api/book-reservations/:id`

Request body:

```json
{
  "status": "READY|ACTIVE|CANCELLED|...",
  "notes": "string|null",
  "librarianId": "user_lib_1"
}
```

Behavior:

- Requires `status` and `librarianId`.
- If `status` is `READY`, the handler verifies the book has available copies; if none, returns 400.

Success 200: returns the updated reservation object (includes `user` and `book` details).

Failure responses:

- 400 `Missing required fields`
- 404 `Reservation not found` (only in the READY pre-check)
- 400 `Cannot approve reservation. No available copies of the book.` (for READY when zero available)
- 500 `Failed to update book reservation`

Source: `src/app/api/book-reservations/[id]/route.ts` (PATCH)

---

### 7) Update Reservation (Approve/Reject with Notes, bulk entry)

PATCH `/api/book-reservations`

Request body:

```json
{
  "id": "res_xxx",
  "status": "READY|ACTIVE|CANCELLED|...",
  "notes": "string|null",
  "librarianId": "user_lib_1"
}
```

Success 200: returns the updated reservation object.

Failure responses:

- 400 `Missing required fields`
- 500 `Failed to update book reservation`

Source: `src/app/api/book-reservations/route.ts` (PATCH)

---

## Book Detail for Copy-Level UI (Mobile)

GET `/api/mobile/books/:bookId`

Notes:

- Requires `Authorization: Bearer <token>`.
- Returns `copies` with per-copy details, including `id`, `copyNumber`, `status`, `location`, and `dueDate` when borrowed.

Success 200 (shape excerpt):

```json
{
  "success": true,
  "data": {
    "id": "book_abc",
    "title": "...",
    "availableCopies": 0,
    "totalCopies": 3,
    "copies": [
      {
        "id": "copy_005",
        "copyNumber": 5,
        "status": "AVAILABLE|BORROWED|RESERVED|...",
        "location": "Shelf A",
        "dueDate": "2025-09-20T00:00:00.000Z|null"
      }
    ]
  }
}
```

Source: `src/app/api/mobile/books/[id]/route.ts` (GET)

---

## Statuses Observed

- Creation: `ACTIVE`
- Review flow: `ACTIVE` → `READY` (when approved/allocated) → `CANCELLED`/`FULFILLED`
- Other statuses may exist in data, but above are enforced in code paths documented here.

---

## Quick Validation Checklist (Current Behavior)

- [ ] Mobile create reservation returns `status: ACTIVE` and no `copyId`.
- [ ] Mobile list reservations includes transformed fields (no `copyId`).
- [ ] Cancel endpoint updates status to `CANCELLED` and returns payload with `cancelledDate` and `cancelledReason`.
- [ ] Admin list supports filters/pagination; search on user/book fields.
- [ ] Admin update by ID enforces available-copies check when setting `READY`.
- [ ] `GET /api/mobile/books/:bookId` returns per-copy `id`, `copyNumber`, `status`, `location`, and `dueDate`.

---

## Notes for Frontend Integration

- The backend currently does not return `copyId` in mobile reservation responses or lists. Copy-level "pending" badges should be derived from admin READY allocations or other UI signals, not from reservation list `copyId`.
- If strict PENDING semantics and `copyId` propagation are required, backend changes would be needed; this guide reflects current live behavior.

