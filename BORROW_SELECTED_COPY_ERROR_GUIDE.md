# Borrow Selected Copy Error - Root Cause and Fix Guide

## Overview
Users encountered an error when pressing “Borrow Selected Copy.” The issue was caused by inconsistent data formats between frontend expectations and backend responses. We fixed the frontend to be resilient, and we recommend a few backend consistency guarantees to prevent future occurrences.

## Frontend Findings (Root Causes)
- **copyId type mismatch**: `copy.id` may be returned as a number or a string. Strict equality checks failed when types differed, so the selected copy wasn’t found.
- **Copy status casing mismatch**: The availability check used `=== 'AVAILABLE'`, while the backend sometimes returned `available`/`Available`, causing false negatives.

## Frontend Fixes (Implemented)
File: `app/borrowing/borrow.jsx`

- **Robust copy matching**
```diff
- const copy = response.data.copies.find(c => c.id === copyId);
+ const copy = response.data.copies.find(c => String(c.id) === String(copyId));
```

- **Robust availability check**
```diff
- if (selectedCopy.status !== 'AVAILABLE') {
+ const normalizedStatus = String(selectedCopy.status || '').toUpperCase();
+ if (normalizedStatus !== 'AVAILABLE') {
    // show error
  }
```

These changes ensure borrow works regardless of backend type/casing differences.

## Backend Recommendations (Stability & Consistency)
- **Stable ID types**: Always return `copy.id` as a string (preferred) or always as a number, but be consistent across all endpoints.
- **Stable status enums**: Always return uppercase statuses:
  - `AVAILABLE`, `BORROWED`, `RESERVED`, `DAMAGED`, `LOST`, `MAINTENANCE`
- **Borrow API contract** (backend-controlled condition assessment):
  - Endpoint: `POST /api/mobile/users/{userId}/books/{bookId}/borrow`
  - Request (simplified, matches current frontend):
```json
{
  "copyId": "copy_123",
  "expectedReturnDate": "2025-12-31T00:00:00.000Z"
  // initialCondition and conditionNotes optional; backend assessment preferred
}
```
- **Error shape**: Standardize error payloads to improve UX and logging:
```json
{
  "success": false,
  "message": "Human-readable error",
  "code": "ENUM_CODE"  // e.g., MISSING_COPY, COPY_UNAVAILABLE, OVERDUE_BLOCK, RATE_LIMIT
}
```

## QA Checklist (End-to-End)
- Select an available copy in Book Details → Press “Borrow Selected Copy” → Condition review opens.
- Review modal shows backend-provided condition; pressing “Confirm Borrow Request” submits successfully.
- If the copy is `BORROWED` or `RESERVED`, the availability check blocks with a user-friendly alert.
- Works whether `copy.id` is numeric or string.
- No crashes or undefined property errors in logs.

## Current Status
- Frontend is updated to normalize `copyId` and status casing.
- Backend alignment on ID types and uppercase status enums will fully eliminate edge cases and simplify future maintenance.

---
Prepared for: Backend/API Team

Purpose: Align data contracts and ensure robust borrow flow.
