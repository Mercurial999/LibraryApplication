## Mobile Reservations Backend Checklist (Required for Correct Frontend Behavior)

This document lists the exact behaviors and payloads the mobile app expects for book reservations. Implementing these guarantees: no duplicate attempts, consistent “pending” badges per-copy, and proper cancel/view flows.

### 1) Endpoints Summary
- POST `/api/mobile/users/:userId/books/:bookId/reserve`
- GET  `/api/mobile/users/:userId/reservations?status=PENDING|ACTIVE|APPROVED|REJECTED|CANCELLED|ALL`
- DELETE `/api/mobile/users/:userId/reservations/:reservationId` (body: `{ reason?: string }`)

Optional but helpful:
- GET  `/api/mobile/books/:bookId` should include `copies` with `status`, `copyNumber`, `location`, and current loan `dueDate` if borrowed.

### 2) Request/Response Contracts

POST Reserve
- Request body:
  - `expectedReturnDate` (ISO string)
  - `initialCondition` (e.g., `GOOD`)
  - `conditionNotes` (string | null)
- Response (on success):
  - `{ success: true, data: { reservationId, userId, bookId, copyId|null, status: 'PENDING' } }`
  - Note: Please include `copyId`. If a specific copy cannot be determined server-side, return `copyId: null` but keep it stable and include it later in list responses once assigned.
- Response (on failure):
  - `{ success: false, error: { code, message } }`
  - Supported `error.code` values the app handles:
    - `DUPLICATE_RESERVATION` → user already has pending/active reservation for `bookId`
    - `BOOK_AVAILABLE` → book has available copies; reservation not allowed
    - `BORROW_LIMIT`, `ACCOUNT_SUSPENDED`, `OVERDUE_BOOKS`, `BOOK_UNAVAILABLE`

GET User Reservations
- Response:
  - `{ success: true, data: { reservations: Reservation[] } }`
  - Each `Reservation` must include: `id`, `bookId`, `status`, `requestDate`, `expectedReturnDate?`, and critically `copyId` when known.
  - Status set: `PENDING | ACTIVE | APPROVED | REJECTED | CANCELLED | COMPLETED` (frontend maps these for badges)

DELETE Cancel Reservation
- Accepts optional JSON body: `{ reason?: string }`
- Response:
  - `{ success: true }` (recommended to return the cancelled reservation payload as well)

### 3) Duplicate Reservation Rules (Server-side Enforcement)
When creating a reservation for `(userId, bookId)`:
- If any existing reservation for that pair is in `PENDING` or `ACTIVE`, return:
  - `400 { success: false, error: { code: 'DUPLICATE_RESERVATION', message: 'User already has a reservation for this book' } }`

### 4) Availability Rule
If the book has available copies (by inventory or real-time check), reservation should be blocked:
- Return `400 { success: false, error: { code: 'BOOK_AVAILABLE', message: 'Book has available copies - no reservation needed' } }`

### 5) Required Fields in Responses (Important)
The frontend depends on these fields:
- Reservation list rows MUST include `copyId` when known. Without `copyId`, the app cannot mark specific copies as “Reservation Pending”. If not available at creation, add it as soon as it’s assigned and ensure GET lists return it.
- Book detail (`/api/mobile/books/:bookId`) should include for each copy:
  - `id` (copyId), `copyNumber`, `status` (`AVAILABLE|BORROWED|RESERVED|...`), `location`/`shelfLocation`, and `dueDate` if borrowed.

### 6) Status Transitions (Reference)
- `PENDING` → created by borrower; awaiting librarian action or automatic queueing
- `ACTIVE` → book is ready/allocated
- `APPROVED`/`REJECTED` → decision made (optional depending on your flow)
- `CANCELLED` → borrower cancels via DELETE endpoint
- `COMPLETED` → reservation fulfilled (book borrowed) or expired

### 7) Auth/CORS Requirements
- All routes should accept `Authorization: Bearer <token>` used by the app.
- Enable CORS for the mobile bundle origin (Expo dev) and production app origin.

### 8) Examples

Reserve – Success
```
POST /api/mobile/users/user_123/books/book_abc/reserve
{ "expectedReturnDate": "2025-10-11T00:00:00.000Z", "initialCondition": "GOOD", "conditionNotes": "Reserved via mobile app" }

200
{ "success": true, "data": { "reservationId": "res_789", "userId": "user_123", "bookId": "book_abc", "copyId": "copy_005", "status": "PENDING" } }
```

Reserve – Duplicate
```
400
{ "success": false, "error": { "code": "DUPLICATE_RESERVATION", "message": "User already has a reservation for this book" } }
```

Reservations List
```
GET /api/mobile/users/user_123/reservations?status=PENDING
200
{ "success": true, "data": { "reservations": [
  { "id": "res_789", "userId": "user_123", "bookId": "book_abc", "copyId": "copy_005", "status": "PENDING", "requestDate": "2025-09-11T12:00:00Z", "expectedReturnDate": "2025-10-11T00:00:00Z" }
] } }
```

Cancel Reservation
```
DELETE /api/mobile/users/user_123/reservations/res_789
{ "reason": "No longer needed" }

200
{ "success": true }
```

### 9) Quick Validation Checklist
- [ ] `POST /reserve` returns `copyId` (or null initially) and proper error codes
- [ ] `GET /reservations` returns `copyId` for each item whenever known
- [ ] Duplicate and availability rules return the specified error codes/messages
- [ ] `DELETE /reservations/:id` cancels and returns success
- [ ] CORS and Auth headers accepted

If any of the above differ in your current backend, please adjust to match this contract so the mobile UI can reliably reflect copy-level pending states and prevent duplicate requests.


