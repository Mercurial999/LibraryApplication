## Android APK Landing Page Integration Guide

Purpose: Provide a simple, copy-ready setup so the landing page can serve the Android APK directly (no Play Store).

### Inputs from Mobile Team
- APK URL: `https://expo.dev/artifacts/eas/4t3EQp9eCxY2jbFV5vTcKE.apk`
- App version: `1.0.0`
- Updated at: `2025-08-25`

This guide assumes a Next.js landing site, but the same ideas apply to any framework.

---

### 1) Environment variables
Create or update `.env.local` in the landing repo root:

```env
ANDROID_APK_URL=https://expo.dev/artifacts/eas/4t3EQp9eCxY2jbFV5vTcKE.apk
APK_VERSION=1.0.0
APK_UPDATED_AT=2025-08-25
```

If you prefer exposing the URL client-side, also add:

```env
NEXT_PUBLIC_ANDROID_APK_URL=https://expo.dev/artifacts/eas/4t3EQp9eCxY2jbFV5vTcKE.apk
```

Restart the dev server after adding/updating env vars.

---

### 2) Simple “Download for Android” button (client-side)
Use the public env var or pass the URL via props:

```tsx
// components/DownloadAndroidButton.tsx
export default function DownloadAndroidButton() {
  const url = process.env.NEXT_PUBLIC_ANDROID_APK_URL || process.env.ANDROID_APK_URL;
  if (!url) return null;

  return (
    <a
      href={url}
      download
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
    >
      Download for Android (APK)
    </a>
  );
}
```

Add the component to your landing page:

```tsx
// pages/index.tsx (or app/page.tsx)
import DownloadAndroidButton from "../components/DownloadAndroidButton";

export default function HomePage() {
  return (
    <main>
      <h1>Library App</h1>
      <DownloadAndroidButton />
    </main>
  );
}
```

---

### 3) Optional: Stable proxy route (hides long Expo URL and sets filename)
Useful if you want a clean URL like `/api/download-apk` and a stable filename.

```ts
// pages/api/download-apk.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apkUrl = process.env.ANDROID_APK_URL;
  if (!apkUrl) return res.status(500).json({ message: "APK URL not configured" });

  try {
    const upstream = await fetch(apkUrl);
    if (!upstream.ok || !upstream.body) {
      return res.status(502).json({ message: "Failed to fetch APK" });
    }

    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", "attachment; filename=LibraryApplication.apk");
    res.setHeader("Cache-Control", "public, max-age=86400"); // cache 1 day

    // Stream APK to the client
    // @ts-ignore - Node stream typing varies by runtime
    upstream.body.pipe(res);
  } catch (e) {
    res.status(500).json({ message: "Proxy error" });
  }
}
```

Then change the button to use the proxy:

```tsx
<a href="/api/download-apk" className="btn">Download for Android (APK)</a>
```

---

### 4) Show version info
Display version and date so users know how fresh the build is:

```tsx
export function ApkVersionInfo() {
  return (
    <p>Version: {process.env.APK_VERSION} — Updated: {process.env.APK_UPDATED_AT}</p>
  );
}
```

---

### 5) Optional: QR code (easy phone install)
Generate a QR that points to `/api/download-apk` or the direct APK URL.

Option A — React component (qrcode.react):

```tsx
// components/ApkQr.tsx
import { QRCodeCanvas } from "qrcode.react";

export default function ApkQr() {
  const url = process.env.NEXT_PUBLIC_ANDROID_APK_URL || "/api/download-apk";
  return <QRCodeCanvas value={url} size={180} includeMargin />;
}
```

Option B — Generate a static PNG asset via Node (no client dep):

1) Install once in the landing repo:
```bash
npm i -D qrcode
```
2) Add a small script `scripts/generate-apk-qr.js`:
```js
// scripts/generate-apk-qr.js
const fs = require('fs');
const QRCode = require('qrcode');

const url = process.env.ANDROID_APK_URL || process.env.NEXT_PUBLIC_ANDROID_APK_URL;
if (!url) {
  console.error('ANDROID_APK_URL not set');
  process.exit(1);
}

QRCode.toFile('public/apk-qr.png', url, { width: 640, margin: 2 }, (err) => {
  if (err) throw err;
  console.log('QR generated: public/apk-qr.png ->', url);
});
```
3) Run:
```bash
ANDROID_APK_URL=https://expo.dev/artifacts/eas/4t3EQp9eCxY2jbFV5vTcKE.apk node scripts/generate-apk-qr.js
```
4) Use the static image on the page:
```tsx
<img src="/apk-qr.png" alt="Download APK QR" width={180} height={180} />
```

---

### 6) Optional: File size display
Do a HEAD request on the server to fetch `content-length` and cache it for a day, then display it on the page. This is optional polish and not required for functionality.

---

### 7) Update process for new releases
When a new EAS build is ready:
- Replace `ANDROID_APK_URL` with the new Artifact URL.
- Bump `APK_VERSION` and `APK_UPDATED_AT`.
- Redeploy the landing site.

Note: If you use the proxy route, the public-facing URL stays stable (`/api/download-apk`). Only env vars change.

---

### 8) Android install notes for users
Add a short help section on the landing page:
- Download the APK.
- On Android, enable “Install unknown apps” for the browser you used.
- Open the APK to install.

---

### 9) Security and reliability notes
- Keep the APK link HTTPS.
- Prefer the proxy route if you want a stable URL and filename.
- No CORS or auth needed for APK download.

---

### 10) Quick checklist (web dev)
- [ ] Add env vars.
- [ ] Add download button (direct URL or `/api/download-apk`).
- [ ] (Optional) Add version text and QR code.
- [ ] Deploy.
- [ ] Test on a phone: navigate to landing page → download → install.


