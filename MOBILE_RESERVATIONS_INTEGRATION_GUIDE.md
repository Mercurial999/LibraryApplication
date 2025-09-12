# Mobile Reservations – Integration Guide (Frontend + Backend Handoff)

Date: 2025-09-03
Status: Frontend wired; ready for end-to-end testing with backend spec (2025-01-27)
Backend Base URL: `https://kcmi-library-system.vercel.app`

## 1) What Changed in the Mobile App

Files updated/added in `LibraryApplication`:
- `services/ApiService.js`
  - reserveBook now sends required fields: `expectedReturnDate`, `initialCondition`, `conditionNotes`
  - new: `listReservations(userId?, status='all')`
  - new: `cancelReservation(userId?, reservationId, reason?)`
- `app/borrowing/reserve.jsx`
  - Uses `getBookDetails(bookId)` (mobile endpoint) for accurate copy data
  - Calls `reserveBook(...)` with condition fields per backend spec
  - For list mode, queries backend for reservable titles (server-driven)
- `app/borrowing/my-requests.jsx`
  - Lists reservations via `ApiService.listReservations(...)`
  - Cancels via backend DELETE and refreshes the list

Impact:
- All reservation flows now depend on legit backend data and contracts, not client-side inference.

## 2) Endpoints the App Calls

- LIST reservations
  - GET `/api/mobile/users/{userId}/reservations?status={all|ACTIVE|READY|FULFILLED|CANCELLED}`
- CREATE reservation
  - POST `/api/mobile/users/{userId}/books/{bookId}/reserve`
  - Body: `{ expectedReturnDate: ISOString, initialCondition: EXCELLENT|GOOD|FAIR|POOR|DAMAGED, conditionNotes?: string|null }`
- CANCEL reservation
  - DELETE `/api/mobile/users/{userId}/reservations/{reservationId}`
  - Body: `{ reason: string }`

Headers for all:
- `Authorization: Bearer {base64_encoded_token}`

## 3) Request/Response Contracts (Rendered by UI)

- LIST response consumed by UI:
```json
{
  "success": true,
  "data": {
    "reservations": [
      {
        "id": "res_abc123",
        "bookId": "book-1",
        "bookTitle": "Book Title",
        "bookAuthor": "Author Name",
        "status": "ACTIVE",
        "reservationDate": "2025-01-20T03:00:00.000Z",
        "expectedReturnDate": "2025-02-01T03:00:00.000Z",
        "daysUntilExpected": 5,
        "isExpired": false,
        "initialCondition": "GOOD",
        "conditionNotes": null,
        "fulfilledDate": null,
        "cancelledDate": null,
        "cancelledReason": null
      }
    ]
  }
}
```

- CREATE success response expected:
```json
{
  "success": true,
  "message": "Book reserved successfully",
  "data": {
    "reservationId": "res_abc123",
    "bookId": "book-1",
    "userId": "user-1",
    "reservationDate": "2025-01-27T03:00:00.000Z",
    "expectedReturnDate": "2025-02-01T00:00:00.000Z",
    "status": "ACTIVE",
    "initialCondition": "GOOD",
    "conditionNotes": "Slightly worn cover"
  }
}
```

- CANCEL success response expected:
```json
{
  "success": true,
  "message": "Reservation cancelled successfully",
  "data": {
    "reservationId": "res_abc123",
    "status": "CANCELLED",
    "cancelledDate": "2025-01-27T03:00:00.000Z",
    "cancelledReason": "No longer needed"
  }
}
```

- Error shape (handled in UI):
```json
{ "success": false, "error": { "code": "BOOK_AVAILABLE", "message": "Copies available" } }
```
UI branches on codes: `BOOK_AVAILABLE`, `DUPLICATE_RESERVATION`, `OVERDUE_BOOKS`, `ALREADY_BORROWED`, `USER_INACTIVE`.

## 4) Reserve Screen – Data Sources

- Book details (before reserving): GET `/api/mobile/books/{bookId}`
  - Must include: `totalCopies`, `availableCopies`, and `copies[].status` with `dueDate` when borrowed.
- Reservable list (when no specific book selected): server-driven list of titles eligible for reservation. We call `GET /api/books?availability=unavailable&limit=100` and render the returned items directly.

## 5) Auth Expectations

- Header: `Authorization: Bearer {base64_json_token}`
- Token contains at least `{ id: string }`
- Backend validates user exists and is `ACTIVE`.

## 6) Testing Matrix (Frontend x Backend)

- Create reservation with valid fields → 200 success
- Missing `expectedReturnDate` → 400 `MISSING_REQUIRED_FIELD`
- Invalid `initialCondition` → 400 `INVALID_CONDITION_VALUE`
- Book has available copies → 400 `BOOK_AVAILABLE` (UI suggests borrowing)
- User has overdue books → 400 `OVERDUE_BOOKS`
- Already borrowed same book → 400 `ALREADY_BORROWED`
- Cancel ACTIVE reservation → 200 success; cancel again → 400 `RESERVATION_ALREADY_CANCELLED`

## 7) Next Steps for Backend

- Ensure LIST, CREATE, CANCEL endpoints behave exactly as above (status filters, error codes, and shapes).
- Guarantee `GET /api/mobile/books/{bookId}` includes `copies[].status` and `dueDate` for borrowed copies.
- Support server-side list of reservable titles via `GET /api/books?availability=unavailable`.
- CORS is enabled for mobile origin.

## 8) Frontend Status

- Screens implemented and wired to the endpoints.
- No further code changes needed on the app side once the endpoints return the described shapes.

---

Maintainers: Frontend ready for joint QA with backend according to this guide.
