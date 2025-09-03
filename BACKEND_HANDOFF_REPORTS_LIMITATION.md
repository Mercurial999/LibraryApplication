# Backend Handoff: Reports Restricted to Borrowed Books

This guide explains the mobile changes and the backend expectations to ensure students can only report books they have actually borrowed.

Reference: `https://kcmi-library-system.vercel.app`

---

## 1) Mobile Behavior (Updated)

- Reports list (`/reports`) now loads the current user's books with status `borrowed` only.
- The UI displays only those items and passes the selected `bookId` to the report screen.
- Report submission calls the mobile reports endpoint with the current user ID and the selected book ID.

### Files Changed
- `app/reports/index.jsx`
  - Fetches with: `ApiService.getUserBooks(null, { status: 'borrowed', includeHistory: false })`
  - Normalizes response and restricts to items where `status` is `borrowed`.
- `app/reports/report.jsx`
  - Submits: `ApiService.reportBook(currentUser.id, bookId, { reportType, description })`
  - `reportType` is one of `LOST` or `DAMAGED` (uppercase).

---

## 2) Required Backend Endpoints & Contracts

### A) Get User Borrowed Books (filtered)
- Path: `GET /api/mobile/users/:userId/books?status=borrowed&includeHistory=false`
- Auth: Bearer
- Response envelope:
```json
{
  "success": true,
  "data": {
    "borrowedBooks": [
      {
        "id": "borrow_txn_123",            
        "bookId": "book_123",
        "bookTitle": "The Great Gatsby",
        "bookAuthor": "F. Scott Fitzgerald",
        "borrowDate": "2025-04-10T09:00:00Z",
        "dueDate": "2025-04-24T09:00:00Z",
        "status": "borrowed"
      }
    ]
  }
}
```
- Notes:
  - Stable IDs: `bookId` is required for follow-up actions.
  - Status values should include `borrowed|returned|overdue` (mobile filters `borrowed`).

### B) Report Book (lost/damaged) — Mobile
- Path: `POST /api/mobile/users/:userId/books/:bookId/report`
- Auth: Bearer
- Body:
```json
{ "reportType": "LOST" | "DAMAGED", "description": "optional string" }
```
- Response:
```json
{ "success": true, "data": { "reportId": "rpt_123", "status": "PENDING" } }
```
- Behavior:
  - Validate that `bookId` is currently borrowed by `userId`.
  - If not, return 403 with `{ success: false, message: "You can only report books you have borrowed." }`.
  - Create lost/damaged report record associated with the borrow transaction.

---

## 3) Authorization Rules (Required)

- The `POST /report` endpoint must enforce that only the user who borrowed the book can report it.
- Server-side check:
  1. Find active borrow transaction for `(userId, bookId)` with status `borrowed`.
  2. If not found, return 403.
  3. Proceed to create report (lost/damaged) attached to that transaction.

---

## 4) CORS & Envelope

- CORS headers must allow `Authorization` header and support preflight.
- Always return JSON envelopes:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Reason here" }
```

---

## 5) Testing Checklist

- [ ] `GET /api/mobile/users/:userId/books?status=borrowed` returns only currently borrowed items
- [ ] Reporting a book not in the user's borrowed list returns 403
- [ ] Reporting a borrowed book returns `{ success: true }` and creates a record
- [ ] Mobile list on `/reports` only shows borrowed books
- [ ] Submitting a report succeeds and updates server state

---

If any field names differ, share an example response so we can adjust the normalization in `app/reports/index.jsx` accordingly.

Last updated: 2025-08-27
