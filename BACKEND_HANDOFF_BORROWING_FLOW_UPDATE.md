# Backend Handoff: Borrowing Flow Update (Reservation-first)

We changed the mobile app so pressing Borrow creates a pending request (reservation) instead of immediately borrowing a copy. Librarians process these requests in the web backend to finalize borrowing.

Reference base URL: `https://kcmi-library-system.vercel.app`

---

## 1) Mobile UI Changes

- Screen: `app/borrowing/borrow.jsx`
  - Previously called `POST /api/mobile/users/:userId/books/:bookId/borrow` immediately and showed a "Borrowed Successfully" message.
  - Now calls `POST /api/mobile/users/:userId/books/:bookId/reserve` to create a borrow request (reservation) and shows "Borrow Request Submitted" with a CTA to `My Requests`.
  - The condition assessment UI remains, but the submit button now says "Submit Request".

- Screen: `app/borrowing/my-requests.jsx`
  - Displays user requests list (frontend placeholder); expecting backend to supply real request data via API.

---

## 2) Required Backend Behavior

### A) Create Borrow Request (Reservation)
- Path: `POST /api/mobile/users/:userId/books/:bookId/reserve`
- Body:
```json
{ "expectedReturnDate": "2025-04-30T00:00:00.000Z" }
```
- Response:
```json
{ "success": true, "data": { "requestId": "req_123", "status": "PENDING" } }
```
- Server behavior:
  - Create a reservation/borrow request with status `PENDING`.
  - Associate request with user and targeted book (and copy, if selected later by staff).
  - Prevent duplicate active requests for the same `(userId, bookId)`.

### B) Approve Borrow Request (Staff Web)
- Path: `POST /api/book-requests/:id/approve` (or existing `/api/book-requests/[id]` routes in web)
- On approval:
  - Allocate a specific `copyId`.
  - Create/transition to a borrow transaction with status `BORROWED`.
  - Update reservation status to `APPROVED` (or `FULFILLED`).
  - Optionally send email/notification.

### C) Cancel/Reject Borrow Request
- Path: `POST /api/book-requests/:id/reject`
- Set status to `REJECTED` and optionally provide reason.

### D) List User Requests (Mobile)
- Path: `GET /api/mobile/users/:userId/book-requests`
- Response:
```json
{
  "success": true,
  "data": {
    "requests": [
      { "id": "req_123", "bookId": "book_1", "bookTitle": "The Great Gatsby", "requestDate": "2025-04-18T10:00:00Z", "status": "PENDING" }
    ]
  }
}
```

---

## 3) Authorization & Constraints

- Only authenticated users can create requests.
- Limit users from creating requests if they have overdue items/fines (optional policy).
- Enforce inventory rules when approving (copy must be available; handle holds/queues).

---

## 4) CORS & Envelopes

- Support CORS with `Authorization` on mobile routes.
- Always return JSON envelopes:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Reason here" }
```

---

## 5) Testing Checklist

- [ ] Borrow button creates a PENDING request via `reserve` endpoint
- [ ] Request appears in `GET /api/mobile/users/:userId/book-requests`
- [ ] Staff approval converts request to BORROWED transaction and decrements available copies
- [ ] Staff rejection marks request REJECTED and frees queue
- [ ] Mobile app shows "Borrow Request Submitted" and navigates to My Requests

---

If endpoint names differ on your web backend, share the final routes so we can update the mobile service method names accordingly.

Last updated: 2025-08-27
