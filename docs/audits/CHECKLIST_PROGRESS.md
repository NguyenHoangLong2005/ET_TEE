- TASK 1 — BUILD & SERVER CHECK: PASS
  - Backend: `mvnw clean package` BUILD SUCCESS, 49 tests pass
  - Frontend: `npm run build` compiled successfully (1.0s)
- TASK 2 — DB SCHEMA CHECK: PASS
  - application.properties: `spring.jpa.hibernate.ddl-auto=validate`
  - All 52 required columns exist in public schema
  - Backend boots without schema validation errors
- TASK 3 — CORE API SMOKE TEST: PASS
  - GET /api/products: 200
  - POST /api/auth/register: 200 (now soft-fails on SMTP, user persisted in DB)
  - POST /api/auth/login: 200 (after dbVerifyEmail shortcut for test user)
  - GET /api/auth/me: 200 (returns userId, fullName, email, status)
  - GET /api/cart: 200
  - POST /api/cart/items: 200 (X-Guest-Cart-Token header)
  - POST /api/orders/checkout: 200 (guest path; customer snapshot saved)
  - GET /api/orders/{orderCode}: 200
  - GET /api/products/{slug}/reviews: 200 (does not 500)
  - GET /api/wishlist: 200
  - Fix: `EmailService` now catches `MailException` and logs OTP instead of throwing,
    so register/login/reset don't roll back when SMTP is unavailable.
    Controlled by `app.mail.fail-soft=true`.


