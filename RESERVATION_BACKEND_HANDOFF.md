# Mobile Reservation Integration – Backend Handoff

This note documents exactly what the mobile app now calls for the reservation feature and what the backend should provide. Once these are satisfied, the reservation flow will be fully “live” using backend data only.

Backend base URL: `https://kcmi-library-system.vercel.app`

## 1) Endpoints Used by Mobile

1. Get book details (mobile-specific)
   - GET `/api/mobile/books/{bookId}`
   - Purpose: Display accurate copy availability and statuses before reserving.
   - Required response fields:
     - `id`, `title`, `author`, `subject`, `ddc`, `isbn`
     - `totalCopies` (number), `availableCopies` (number)
     - `shelfLocationPrefix` (string)
     - `courseProgram` (string | null)
     - `copies`: array of objects with:
       - `id` (string | number)
       - `copyNumber` (string)
       - `status` one of: `available | borrowed | reserved | damaged | lost`
       - `dueDate` ISO (present when `status === 'borrowed'`)
       - optional `reservedBy` (string) when reserved (for display)

2. List books filtered for “reservable” (all copies currently borrowed)
   - GET `/api/books?availability=unavailable&limit=100`
   - Purpose: Show the list of books that can be reserved.
   - Contract: When `availability=unavailable` the API should return only books with `totalCopies > 0` and `availableCopies = 0`.
   - Required response shape:
     ```json
     {
       "success": true,
       "data": {
         "books": [
           {
             "id": "book123",
             "title": "...",
             "author": "...",
             "subject": "...",
             "ddc": "...",
             "isbn": "...",
             "totalCopies": 3,
             "availableCopies": 0,
             "shelfLocationPrefix": "HS",
             "courseProgram": "Bachelor of Elementary Education"
           }
         ]
       }
     }
     ```

3. Create reservation (mobile)
   - POST `/api/mobile/users/{userId}/books/{bookId}/reserve`
   - Body:
     ```json
     {
       "expectedReturnDate": "2025-12-31T00:00:00.000Z"
     }
     ```
   - Response:
     ```json
     { "success": true, "message": "Reservation created" }
     ```

## 2) Mobile App Behavior (current)
- Book details screen (Reserve) calls GET `/api/mobile/books/{bookId}` to render copy list and availability.
- Reservation list screen calls GET `/api/books?availability=unavailable&limit=100` and displays returned books as reservable candidates without client-side guessing.
- Pressing “Reserve” calls POST `/api/mobile/users/{userId}/books/{bookId}/reserve` with `expectedReturnDate` (no condition assessment required for reservation; backend handles policy checks).

## 3) Backend Requirements Checklist
- [ ] Implement/verify GET `/api/mobile/books/{bookId}` returns the fields listed above, especially `copies[].status` and `dueDate`.
- [ ] Ensure GET `/api/books` supports `availability=unavailable` and returns only books with `availableCopies = 0` and `totalCopies > 0`.
- [ ] Confirm POST `/api/mobile/users/{userId}/books/{bookId}/reserve` accepts `{ expectedReturnDate }` and returns `{ success: true }` on success.
- [ ] CORS allows calls from the mobile app.
- [ ] Optional: include `reservable: true|false` per book to future-proof; not required by current app.

## 4) Example Payloads

- Successful mobile book details response (truncated):
```json
{
  "success": true,
  "data": {
    "id": "book123",
    "title": "Advanced Mathematics",
    "author": "John Smith",
    "totalCopies": 3,
    "availableCopies": 0,
    "shelfLocationPrefix": "HS",
    "courseProgram": "Bachelor of Secondary Education",
    "copies": [
      { "id": "c1", "copyNumber": "HS-001", "status": "borrowed", "dueDate": "2025-10-05T00:00:00Z" },
      { "id": "c2", "copyNumber": "HS-002", "status": "borrowed", "dueDate": "2025-10-06T00:00:00Z" },
      { "id": "c3", "copyNumber": "HS-003", "status": "reserved" }
    ]
  }
}
```

- Reservable list response with `availability=unavailable` (truncated):
```json
{
  "success": true,
  "data": {
    "books": [
      { "id": "book123", "title": "Advanced Mathematics", "author": "John Smith", "totalCopies": 3, "availableCopies": 0 },
      { "id": "book456", "title": "Physics Fundamentals", "author": "Jane Smith", "totalCopies": 2, "availableCopies": 0 }
    ]
  }
}
```

- Reservation create response:
```json
{ "success": true, "message": "Reservation created" }
```

## 5) Failure Cases (expected by mobile)
- 404 when `bookId` doesn’t exist → app shows an error alert and navigates back.
- 400 on reservation when policy fails (e.g., user has overdue books) with `{ success: false, message: "..." }` → app shows the message to the user.

## 6) Frontend Status
- Mobile reservation UI is wired and calling the endpoints above.
- Once the availability filter and book details endpoints return the documented fields, the flow is fully live with backend data.

Last Updated: 2025-09-03
