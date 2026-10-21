# ET.TEE mobile app

Flutter app for Android and iOS, connected to the existing Spring Boot API.
The signed-in role determines which management modules are displayed.
The `mobile/` project is separate from the existing `web/` and `backend/`
projects; it consumes their deployed APIs and does not copy or fork their
source files.

## Included workflows

- **Admin:** user directory with account lock/unlock and staff-user creation;
  branch creation/editing and activation; system audit log.
- **Store owner:** shop dashboard, shop orders, products, pending approvals,
  staff creation/lock/unlock, shifts, and branch audit log.
- **Customer support (CSKH):** support ticket queue and conversations, ticket
  status/replies, restricted order lookup, voucher quota, and lookup audit log.

These screens call the existing `/api/...` endpoints. Authorization remains
enforced by the backend; hiding a mobile screen is not a substitute for API
permissions.

The **Toàn bộ chức năng website** entry opens the existing Next.js portal inside
the mobile app, so web pages that have not been ported to native screens remain
available with their existing workflows. Configure `WEB_APP_URL` to a reachable
web deployment. The website may require signing in separately from the native
mobile session.

## Run locally

From the repository root in PowerShell:

```powershell
Set-Location mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080
```

`10.0.2.2` points to the development computer from the Android emulator. For an
iOS simulator, use `http://127.0.0.1:8080`. For a physical phone, use the
computer's reachable LAN address, for example
`http://192.168.1.10:8080`, and ensure the phone can reach the backend.
Start the Next.js site separately and configure its URL, for example:

```powershell
flutter run `
  --dart-define=API_BASE_URL=http://10.0.2.2:8080 `
  --dart-define=WEB_APP_URL=http://10.0.2.2:3000
```

On a physical phone, configure both URLs with the computer's reachable LAN
address. For production, use HTTPS and pass the API and website origins through
`API_BASE_URL` and `WEB_APP_URL`.

## Build

```powershell
flutter build apk `
  --dart-define=API_BASE_URL=https://api.example.com `
  --dart-define=WEB_APP_URL=https://shop.example.com
flutter build ios `
  --dart-define=API_BASE_URL=https://api.example.com `
  --dart-define=WEB_APP_URL=https://shop.example.com
```

The Android manifest currently allows cleartext HTTP for local development.
Do not ship an HTTP API endpoint in production; use HTTPS.
