## Mobile Renew & Report – Frontend Handoff (Single File)

Authoritative reference for the mobile app. Backend routes are live and return JSON only. Paths are unchanged.

---

### 1) Renew Flow (Approval-First)

- Action: Submit a renewal request for a specific copy. No due-date change on submit; librarian approval updates it.

Endpoint
- POST `/api/mobile/users/{userId}/books/{bookId}/renew`

Request Body
```json
{ "copyId": "BOOK_COPY_ID", "reason": "optional", "notes": "optional" }
```

Success (200)
```json
{
  "success": true,
  "data": {
    "requestId": "rr-...",
    "status": "PENDING",
    "currentDueDate": "2025-09-10T00:00:00.000Z",
    "requestedDueDate": "2025-09-24T00:00:00.000Z",
    "message": "Renewal request submitted for librarian approval"
  }
}
```

Errors
- 400 `MISSING_COPY_ID`: provide `copyId`
- 404 `BORROW_NOT_FOUND`: no active borrow for this user/book/copy
- 400 `OVERDUE_BOOK`: cannot renew overdue loans
- 409 `RESERVATION_CONFLICT`: copy is reserved by another user
- 400 `REQUEST_EXISTS`: one PENDING request already exists

UI Guidance
- On success: show “Submitted for approval”. Do not change due date locally.
- On error: map codes to user-friendly text (see mapping below).

Minimal Frontend Call (already available in `ApiService.createMobileRenewal`)
```ts
await ApiService.createMobileRenewal(userId, bookId, { copyId, reason, notes });
```

---

### 2) List Renewal Requests (User)

Endpoint
- GET `/api/mobile/users/{userId}/requests?type=renewals`

Success (200)
```json
{
  "success": true,
  "data": {
    "renewals": [
      {
        "id": "rr-...",
        "bookId": "...",
        "copyId": "...",
        "bookTitle": "... or null",
        "bookAuthor": "... or null",
        "copyNumber": 1,
        "currentDueDate": "ISO",
        "requestedDueDate": "ISO",
        "status": "PENDING|APPROVED|REJECTED",
        "requestDate": "ISO",
        "reason": "Extension requested"
      }
    ]
  }
}
```

UI Guidance
- Render under “Renewal Requests” tab.
- Status badges: PENDING, APPROVED, REJECTED.
- When status becomes APPROVED, refresh borrowed items to reflect new due date.

Minimal Frontend Call (already available in `ApiService.getUserRenewalRequests`)
```ts
const { data } = await ApiService.getUserRenewalRequests();
const rows = data?.renewals || [];
```

---

### 3) Lost/Damaged Report (Unchanged)

Endpoint
- POST `/api/mobile/users/{userId}/books/{bookId}/report`
- Headers: `Authorization: Bearer <token>`

Body
```json
{ "reportType": "LOST" | "DAMAGED", "description": "optional" }
```

Success (200)
```json
{
  "success": true,
  "data": {
    "reportId": "report_...",
    "bookId": "...",
    "reportType": "LOST|DAMAGED",
    "description": "...",
    "status": "PENDING",
    "reportDate": "ISO"
  }
}
```

Minimal Frontend Call (already available in `ApiService.reportMobileIncident`)
```ts
await ApiService.reportMobileIncident(userId, bookId, { type: 'LOST'|'DAMAGED', description });
```

---

### 4) Error Handling Mapping (Renew)

Recommended messages:
- `OVERDUE_BOOK` → "Cannot renew overdue book. Please return it first."
- `RESERVATION_CONFLICT` → "This copy is reserved by another user. Renewal not allowed."
- `BORROW_NOT_FOUND` → "No active borrow found for this copy."
- `REQUEST_EXISTS` → "A renewal request is already pending."
- Default → "Something went wrong. Please try again."

Type hint
```ts
type RenewErrCode =
  | 'MISSING_COPY_ID'
  | 'BORROW_NOT_FOUND'
  | 'OVERDUE_BOOK'
  | 'RESERVATION_CONFLICT'
  | 'REQUEST_EXISTS'
  | 'INTERNAL_ERROR';
```

---

### 5) Where it is wired in the app

- Renew submit: `app/borrowing/my-books.jsx` → `handleRenewBook` uses `ApiService.createMobileRenewal(...)`.
- Requests tab: `app/borrowing/my-requests.jsx` fetches via `ApiService.getUserRenewalRequests()` and renders the list with status and dates.
- Incidents (lost/damaged): `my-books.jsx` report modal → `ApiService.reportMobileIncident(...)`.

---

### 6) QA Checklist

- Renewing an overdue loan returns `OVERDUE_BOOK`.
- Renewing a reserved copy returns `RESERVATION_CONFLICT`.
- Second renew submit while pending returns `REQUEST_EXISTS`.
- After librarian approval, the due date updates in the borrowed list after refresh.


