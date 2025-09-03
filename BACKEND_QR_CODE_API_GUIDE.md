# Backend QR Code API Guide (Updated)

This guide documents the exact API contract for QR code functionality as specified by the backend developer.

**Reference base URL:** `https://kcmi-library-system.vercel.app`

---

## 🔐 Authentication

- **Required headers on protected routes:**
  - `Authorization: Bearer <token>`
  - `Content-Type: application/json`

---

## 📱 User Profile QR Code

### Endpoint
`GET /api/mobile/users/{userId}/profile`

### Response Structure
```json
{
  "success": true,
  "data": {
    "display": { 
      "fullName": "John Doe", 
      "role": "STUDENT" 
    },
    "qrCodeImage": "data:image/png;base64,iVBORw0...",
    "qrCodeData": {
      "type": "LIBRARY_USER",
      "userType": "STUDENT",
      "userId": "usr_123",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "timestamp": 1705312800000
    }
  }
}
```

### Notes
- `qrCodeImage`: Base64 encoded PNG image for direct display
- `qrCodeData`: JSON object containing user information for QR code generation
- If `qrCodeImage` is missing, frontend will generate QR locally from `qrCodeData`

---

## 📚 Book QR Codes

### Endpoint
`GET /api/mobile/books/{bookId}`

### Response Structure (trimmed)
```json
{
  "success": true,
  "data": {
    "id": "book_1",
    "title": "The Great Gatsby",
    "copies": [
      {
        "id": "copy_101",
        "copyNumber": "GAT-001",
        "status": "AVAILABLE",
        "location": "A-1-01",
        "condition": "GOOD",
        "qrCodeData": {
          "type": "LIBRARY_BOOK",
          "bookId": "book_1",
          "copyId": "copy_101",
          "title": "The Great Gatsby",
          "copyNumber": "GAT-001",
          "status": "AVAILABLE",
          "location": "A-1-01",
          "condition": "GOOD",
          "timestamp": 1705312800000
        },
        "qrCodeImage": "data:image/png;base64,iVBORw0..."
      }
    ]
  }
}
```

### Notes
- Each book copy includes its own QR code data and image
- `qrCodeData` contains book and copy-specific information
- `qrCodeImage` is the pre-generated QR code image

---

## 🎯 Frontend Implementation

### QR Code Display Priority
1. **Prefer `qrCodeImage`** for direct display
2. **Fallback to `qrCodeData`** for local QR generation if image is missing

### React Native Example
```tsx
import QRCode from "react-native-qrcode-svg";

function UserQR({ profile }) {
  const { qrCodeImage, qrCodeData } = profile;
  
  if (qrCodeImage) {
    return (
      <Image
        source={{ uri: qrCodeImage }}
        style={{ width: 200, height: 200 }}
      />
    );
  }
  
  if (qrCodeData) {
    return <QRCode value={JSON.stringify(qrCodeData)} size={200} />;
  }
  
  return null;
}
```

---

## 🧪 Testing

### Curl Examples
```bash
# Get user profile with QR code
curl -s -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     "https://kcmi-library-system.vercel.app/api/mobile/users/<userId>/profile"

# Get book details with QR codes
curl -s -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     "https://kcmi-library-system.vercel.app/api/mobile/books/<bookId>"
```

---

## ⚠️ Troubleshooting

- **Infinite loading**: Check `Authorization: Bearer <token>` header
- **CORS errors**: Confirm origin is in allowed CORS origins (Expo dev + production)
- **All responses return JSON** with CORS headers
- **Error envelope format**: `{ "success": false, "message": "Reason here" }`

---

## 📋 Response Envelope

All endpoints return standardized JSON envelopes:
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Reason here" }
```

---

**Last Updated:** 2025-08-27  
**Status:** Production Ready - Exact API Contract
