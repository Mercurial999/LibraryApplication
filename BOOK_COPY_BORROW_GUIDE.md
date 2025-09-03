## Mobile Borrow/Return With Copy Selection – Backend Guide

Purpose: Align backend APIs with the mobile app so borrowers can see per‑copy details and borrow a specific copy.

### 1) Required data model (response shape)
Book details endpoint must include per‑copy info:

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
        "id": "COPY_ID_1",
        "copyNumber": "MATH-001",
        "status": "AVAILABLE",                
        "location": "Shelf A-1",
        "condition": "GOOD",
        "borrowedBy": null,
        "dueDate": null,
        "reservedBy": null
      },
      {
        "id": "COPY_ID_2",
        "copyNumber": "MATH-002",
        "status": "BORROWED",
        "location": "Shelf A-1",
        "condition": "GOOD",
        "borrowedBy": { "id": "U1", "name": "John Smith" },
        "dueDate": "2025-12-31T00:00:00Z",
        "reservedBy": null
      }
    ]
  }
}
```

Status values (uppercase): `AVAILABLE | BORROWED | RESERVED | DAMAGED | LOST | MAINTENANCE`

### 2) Endpoints the mobile app calls

1) Get details (returns copies array):
- GET `/api/books/{bookId}` or `/api/mobile/books/{bookId}`

2) Borrow a specific copy:
- POST `/api/mobile/users/{userId}/books/{bookId}/borrow`
- Body:
```json
{
  "copyId": "COPY_ID_1",
  "expectedReturnDate": "2025-12-31T00:00:00Z",
  "initialCondition": "GOOD",
  "conditionNotes": "Assessed during borrowing"
}
```

3) Return a specific copy:
- POST `/api/mobile/users/{userId}/books/{bookId}/return`
- Body:
```json
{
  "copyId": "COPY_ID_1",
  "condition": "GOOD",
  "notes": "Returned via mobile"
}
```

4) Renew a borrowed copy (optional):
- POST `/api/mobile/users/{userId}/books/{bookId}/renew`
- Body (if needed): `{ "copyId": "COPY_ID_1" }`

### 3) Backend validation & state transitions
- Borrow
  - Validate: user exists, book exists, `copyId` belongs to `bookId`, copy.status === `AVAILABLE`.
  - Set: copy.status → `BORROWED`, set `borrowedBy`, `dueDate`.
  - Update counts: `availableCopies = totalCopies - (#BORROWED + #RESERVED + #LOST + #DAMAGED + #MAINTENANCE)`.
  - Create borrow transaction row with userId, bookId, copyId, dates, condition.

- Return
  - Validate: transaction exists for userId/bookId/copyId and is open.
  - Set: copy.status → `AVAILABLE` (unless `DAMAGED`/`LOST` per condition), clear `borrowedBy`, clear `dueDate`.
  - Record condition assessment; if damaged or lost, generate fine workflow as applicable.

- Renew
  - Validate: open borrow, renewal limits, no conflicting reservation.
  - Extend `dueDate`.

### 4) Response format & errors
- Success: `{ "success": true, "data": { ... } }`
- Error: `{ "success": false, "message": "..." }` with proper HTTP status (400/401/403/404/409/500).
- Common 409 conflicts: borrowing an already borrowed/reserved copy.

### 5) Consistency rules
- Status values in uppercase.
- Dates in ISO 8601.
- IDs consistent strings everywhere.
- List endpoint (`GET /api/books`) must NOT include `copies[]`; only counts (`totalCopies`, `availableCopies`).

### 6) Example SQL (conceptual)
```
UPDATE book_copies
SET status = 'BORROWED', borrowed_by = :userId, due_date = :due
WHERE id = :copyId AND book_id = :bookId AND status = 'AVAILABLE';

-- If rowCount = 0 → conflict (already borrowed/reserved)
```

### 7) Testing checklist
- [ ] Details returns copies with correct statuses and fields.
- [ ] Borrow of AVAILABLE copy succeeds; second borrow on same copy fails (409).
- [ ] Return updates status and counts; condition recorded.
- [ ] Counts match copies after each operation.

This spec matches the mobile UI which now displays copy `location`, `condition`, borrower name, and due date, and sends `copyId` in borrow/return actions.


