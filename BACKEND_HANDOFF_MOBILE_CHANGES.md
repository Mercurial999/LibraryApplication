# Backend Handoff: Mobile QR + Registration Image Changes

This document summarizes the latest mobile app changes and the exact backend expectations to ensure everything works end-to-end.

Related deployment: `https://kcmi-library-system.vercel.app/`

---

## 1) QR Code Features (No frontend breaking changes)

- Account screen calls: `GET /api/mobile/users/:userId/profile`
  - Expected JSON envelope: `{ success, data, message? }`
  - `data.qrCodeImage`: data URL (e.g., `data:image/png;base64,...`) — preferred
  - `data.qrCodeData`: JSON payload with at least: `type`, `userType`, `userId`, `firstName`, `lastName`, `timestamp`
- Book details calls: `GET /api/mobile/books/:bookId`
  - `data.copies[]` include: `id`, `copyNumber`, `status`, `location`, `condition`
  - Optional: `qrCodeImage` and/or `qrCodeData` per copy
- Error contract: always return JSON, never HTML. Use proper status codes and `{ success: false, message }` body.

Reference details are in `LibraryApplication/BACKEND_QR_CODE_API_GUIDE.md`.

---

## 2) Registration Images: Cloudinary-first flow (Frontend changes)

We updated the mobile registration to prefer Cloudinary upload before sending the registration payload. If upload isn’t available, it falls back to base64 data URLs.

### 2.1 Frontend Changes

Files touched:
- `services/ApiService.js`
  - Added `makeMultipartCall(url, formData, method)` — avoids setting `Content-Type` so boundary is correct.
  - Added `uploadImage(fileObject, type, userId?)` — calls `POST /api/upload` (multipart/form-data) and expects `{ success, data: { url, publicId } }`.
  - `registerBorrower(borrower)` updated to pass through `studentPhoto`/`idPhoto` as provided (Cloudinary `publicId`/URL preferred). Base64 still supported.
- `app/register/index.jsx`
  - On submit, uploads `studentPhoto` and `idPhoto` via `ApiService.uploadImage`.
  - If upload succeeds, uses `publicId` (preferred) or `url` in payload.
  - If upload fails, falls back to base64 `data:image/jpeg;base64,...` strings.

Payload (example) now sent to `POST /api/users`:
```json
{
  "firstName": "Juan",
  "middleInitial": "A",
  "lastName": "Dela Cruz",
  "email": "juan@example.com",
  "role": "STUDENT",
  "academicLevelType": "COLLEGE",
  "gradeLevel": "1ST_YEAR",
  "department": null,
  "password": "optional",
  "studentPhoto": "library_system/user_123_studentPhoto_1700000000",
  "idPhoto": "https://res.cloudinary.com/<cloud>/image/upload/v170.../library_system/user_123_id.jpg",
  "status": "PENDING"
}
```

If upload helper is unavailable, the app will send data URLs instead:
```json
{
  "studentPhoto": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
  "idPhoto": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
}
```

### 2.2 Backend Expectations

- Provide `POST /api/upload` (multipart/form-data)
  - Fields: `file` (image), `type` (`studentPhoto` | `idPhoto`), `userId` (optional)
  - Response: `{ success: true, data: { url: "https://...", publicId: "library_system/..." } }`
  - CORS: allow `Authorization` header, handle `OPTIONS`
- `POST /api/users` accepts any of the following for `studentPhoto` and `idPhoto`:
  - Cloudinary `publicId` (preferred)
  - Full Cloudinary HTTPS URL
  - Base64 data URL (server uploads to Cloudinary)
- `PATCH /api/users/:id` accepts same for photo updates.

### 2.3 ENV on server

- `CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`
- `NEXTAUTH_URL` for your deployment (or local)
- Email vars if notifications are used: `EMAIL_USER`, `EMAIL_PASS` (or `GMAIL_APP_PASSWORD`), optional `EMAIL_FROM`

---

## 3) CORS and Response Contract

- Always return JSON envelopes: `{ success: boolean, data?: any, message?: string }`
- CORS headers for web/mobile:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Methods: GET, POST, PATCH, OPTIONS
```
- Respond to `OPTIONS` preflight with 200 + headers

---

## 4) Testing Checklist

- [ ] `POST /api/upload` returns `{ url, publicId }` for both student and ID photos
- [ ] `POST /api/users` accepts `publicId` or URL and stores references
- [ ] Registration succeeds when upload is down (base64 fallback)
- [ ] `GET /api/mobile/users/:userId/profile` returns `qrCodeImage` and `qrCodeData`
- [ ] `GET /api/mobile/books/:bookId` returns copies with IDs and optional QR data
- [ ] All endpoints return JSON and proper CORS headers

---

If any field names differ on your side, share an example response and we can align the frontend or this guide accordingly.

Last updated: 2025-08-27
