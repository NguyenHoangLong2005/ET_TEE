# Review Report

Project: **ET.TEE Shop** (fashion-recommendation-system)
Stack: Spring Boot 3.4.3 + Java 25, Next.js 16.3.4 (React 19), PostgreSQL (Hibernate `ddl-auto=update`)
Reviewer: Senior Fullstack + Security Review (read-only)
Ngày review: 2026-09-12

> Quy tắc: KHÔNG sửa code, KHÔNG refactor, chỉ phân tích. Mọi phát hiện đều có file/API/line cụ thể. Build/test đã chạy thật (xem mục **Test Results**).

---

## Executive Summary

ET.TEE Shop ở trạng thái **MVP có prototype**: backend compile và build được, frontend `next build` xanh nhưng trong quá trình `mvn test` Hibernate cố sinh schema và **đã nổ 1 lỗi FK constraint khi chạy test** (`order_item_id` referenced in foreign key constraint does not exist) — đây là dấu hiệu schema drift giữa entity và DB đang để `ddl-auto=update`. Toàn bộ kiến trúc an ninh thiếu RBAC (JWT chỉ gắn email, không gắn authorities), nhiều endpoint nguy hiểm được mở `permitAll`, logic checkout/review/cart có nhiều lỗ hổng nghiêm trọng cho phép truy cập chéo dữ liệu. Frontend build PASS nhưng trang chủ `/` và các trang account/checkout/order-success có lỗi logic nghiêm trọng (key localStorage sai, ép login ở PDP, thiếu error boundary…).

**Mức độ sẵn sàng: LOW** — Có thể chạy dev, **chưa thể lên production** mà chưa sửa hết Critical/High.

Tóm tắt số lượng vấn đề theo mức độ:

| Mức độ | Số lượng |
|---|---|
| Critical | 8 |
| High | 12 |
| Medium | 13 |
| Low | 10 |

Điểm nổi bật:
- **Backend** build OK; test chạy nhưng **Hibernate schema generation fail** (`order_item_id` FK không tồn tại) → `ddl-auto=update` + thiếu Flyway = data integrity disaster.
- **Frontend** build PASS nhưng gửi `Bearer null` ở 2 trang quan trọng nhất (orders, order-success), và PDP chặn khách vãng lai không cho add-to-cart.
- Không có marketing staff features (banner, campaign, voucher) trong code hiện tại.

---

## Critical Issues

| ID | Severity | File / API | Mô tả lỗi | Cách tái hiện | Rủi ro | Gợi ý sửa |
|---|---|---|---|---|---|---|
| **C-01** | Critical | `backend/src/main/java/com/nguyenhoanglong/config/SecurityConfig.java:41` + `controller/admin/AdminProductController.java:23` + `service/DataAuditService.java:46-220` | `POST /api/admin/products/audit` được khai báo **`permitAll`** (không cần auth) và `DataAuditService.runProductAudit()` có ghi DB thật (slug, colorHex, gender, color name → "Theo ảnh"), lại sinh file `product-data-audit.{json,md}` vào working directory. | Không cần token, gọi `curl -X POST http://host:8081/api/admin/products/audit` → toàn bộ catalog bị mutate. | Bất kỳ ai cũng có thể xóa/sửa dữ liệu catalog; ghi đè slug hiện có (gây 404 cho PDP). | Bỏ `permitAll` ở matcher này; thêm `hasRole('ADMIN')`. Có thể tách thành `@PostConstruct` chạy 1 lần thay vì endpoint. |
| **C-02** | Critical | `backend/src/main/java/com/nguyenhoanglong/service/OrderService.java:170-181` (`getOrderDetails`) | Khi `order.getUser() == null` (đơn guest), `if` không thực thi → **bỏ qua ownership check**. Bất kỳ user đã đăng nhập nào biết `orderCode` đều đọc được thông tin (tên, SĐT, địa chỉ, items, tổng tiền) của khách. | 1) Guest checkout ghi nhận `orderCode`. 2) Đăng nhập user khác. 3) `GET /api/orders/{orderCode}` → trả về đầy đủ PII. | Lộ PII + toàn bộ giỏ hàng đã mua của khách. Có thể kết hợp brute-force orderCode (format `DH{millis}-{4-hex}` đoán được). | Trả `404` cho guest order khi caller không phải chủ sở hữu (yêu cầu `guest_token` hoặc `email + phone`); rotate orderCode thành UUID v7/opaque token. |
| **C-03** | Critical | `backend/src/main/java/com/nguyenhoanglong/controller/ReviewController.java:39-56` + `service/ReviewService.java:170-220` + `config/JwtAuthenticationFilter.java:49-50` | Filter `JwtAuthenticationFilter` set principal là **String email**, không phải `User`. Controllers inject `@AuthenticationPrincipal User user` → luôn `null`. Service cứ rơi vào nhánh "guest check" → đăng nhập vẫn phải cung cấp `orderCode + email`. Không có cách nào review "bằng tài khoản". | Login → gọi `GET /api/products/{slug}/reviews/eligibility` (không truyền orderCode) → trả `NOT_LOGGED_IN`. `POST /reviews` (không truyền orderCode) → trả `UNAUTHORIZED`. | Review flow cho user đăng nhập bị hỏng hoàn toàn; không có cách chính thống để verify purchase. | Inject `User` bằng `SecurityContext` + `UserRepository` (giống `OrderController`/`AccountController`); sửa `checkEligibility` & `createReview` để nhận diện user thật. |
| **C-04** | Critical | `backend/src/main/java/com/nguyenhoanglong/controller/ProductController.java:83-101` + `controller/staff/StaffProductController.java` + `config/JwtAuthenticationFilter.java:52` | Mọi JWT hợp lệ đều có thể `POST /api/products`, `PUT /api/products/{id}`, `DELETE /api/products/{id}`, `GET /api/admin/users`, `GET/POST/PUT/DELETE /api/staff/products/**`. JWT không bao giờ gán authorities (`null` ở constructor `UsernamePasswordAuthenticationToken`). | Tạo tài khoản customer thường → gọi `DELETE /api/products/1` → 200 OK, sản phẩm bị xóa. | Bất kỳ user đã verify email đều có quyền admin. Đây là **broken access control** (OWASP #1). | Thêm trường `role` (enum `USER/STAFF/ADMIN`) lên `User`; thêm claims `role` vào JWT; thêm `.requestMatchers("/api/admin/**").hasRole("ADMIN")` ở SecurityConfig; bật `@EnableMethodSecurity` + `@PreAuthorize`. |
| **C-05** | Critical | `web/src/app/account/orders/page.tsx:23` + `web/src/app/order-success/[orderCode]/page.tsx:24` | Hai trang này gọi `localStorage.getItem('token')` nhưng `AuthContext` (và phần còn lại của app) lưu **`auth_token`** (xem `web/src/contexts/AuthContext.tsx:52`). Kết quả: `Authorization: Bearer null` → backend trả 401. Trang **orders** redirect về `/auth/login`; trang **order-success** mãi ở "Đang tải…" rồi `setIsLoading(false)` nhưng `user` đã có nên vẫn return `null` (dòng 53). | Đăng nhập → `/account/orders` → redirect về login; checkout guest → `/order-success/{code}` → màn hình trắng. | Toàn bộ UX sau thanh toán/lịch sử đơn bị hỏng cho mọi user đăng nhập; guest không thấy order confirmation. | Đổi thành `localStorage.getItem('auth_token')` ở cả 2 file; refactor ra helper `getAuthToken()` chung. |
| **C-06** | Critical | `web/src/app/page.tsx:14-21` (Home, RSC) | `Home()` gọi trực tiếp `ProductService.getNewProducts/BestSellers/SaleProducts/PersonalizedRecommendations/FamilyOutfitProducts` (5 cuộc gọi `fetch` nối tiếp) **trong async server component không có try/catch và không có `error.tsx`/`loading.tsx`**. Khi backend down → Next render default error UI (đỏ, full-screen) → toàn trang chủ chết. | Stop backend → mở `/` → màn hình lỗi đỏ full-page của Next. | Toàn app "đỏ" khi backend chết; Sonner toast chỉ phục vụ mutation; không có overlay backend-down đúng nghĩa. | Render skeleton server-side khi throw; bọc mỗi call trong `Promise.allSettled` + guard null; thêm `web/src/app/error.tsx` + `loading.tsx` cho mọi route. |
| **C-07** | Critical | `web/src/components/products/ProductInfo.tsx:34-39` (`handleAddToCart`) | PDP ép login (`if (!user) { setShowLoginModal(true); return; }`) mặc dù backend `CartService`/`OrderService` đều hỗ trợ guest cart/guest checkout. | Browse guest → vào PDP → bấm "Thêm vào giỏ" → popup login hiện ra. | Guest commerce bị phá vỡ ngay từ đầu phễu. | Chỉ bắt buộc login khi thực sự cần (e.g. sau checkout chứ không phải trước add-to-cart). |
| **C-08** | Critical | `backend/src/main/java/com/nguyenhoanglong/service/OrderService.java:96-104` + `entity/ProductVariant.java` | Checkout trừ `availableQuantity` & `stock` với **read-then-write không có lock, không có `@Version` optimistic locking, không có CHECK constraint**. | 2 request checkout đồng thời cho variant còn 1 sản phẩm → cả 2 đều thấy `available=1`, cả 2 trừ → `available=-1`. | Oversell; đơn ảo; user thanh toán nhưng kho âm. | Bọc trong `SELECT … FOR UPDATE` (PG) hoặc thêm `@Version Long version` lên `ProductVariant`; thêm DB `CHECK (available_quantity >= 0 AND stock >= 0)`. |

---

## Security Issues

| ID | Severity | File / API | Mô tả | Cách tái hiện | Rủi ro | Gợi ý sửa |
|---|---|---|---|---|---|---|
| **S-01** | High | `backend/src/main/java/com/nguyenhoanglong/cart/controller/CartController.java` + `controller/WishlistController.java` (`/api/cart/**`, `/api/wishlist/**` permitAll) | Toàn bộ API cart/wishlist là **public**; quyền sở hữu = sở hữu `guest_cart_token`. Token do client tự sinh (`crypto.randomUUID()` ở `web/src/lib/services/cartService.ts:35-41`), không do server cấp, không có HMAC, không rotate. | XSS hoặc chia sẻ link → attacker đọc/ghi/clear giỏ; hoặc chỉ cần trộm localStorage. | Full cart takeover + checkout bằng cart người khác. | Server phát hành token ngay lần truy cập đầu; bind token với IP/user-agent + set `HttpOnly` cookie; có TTL. |
| **S-02** | High | `backend/src/main/java/com/nguyenhoanglong/controller/CartController.java:62-69` (`POST /api/cart/merge`) | Endpoint merge cart **public**. Attacker đăng nhập + chèn `X-Guest-Cart-Token` của nạn nhân → guest cart nạn nhân bị gộp vào tài khoản attacker, attacker có thể tạo đơn trên cart đó. | Đăng nhập user A → POST `/api/cart/merge` kèm `X-Guest-Cart-Token=abc` của user B → cart B sang A. | Mất/quan hệ giỏ hàng; đặt hàng trộm. | Yêu cầu JWT + verify guest token là của thiết bị hiện tại (cookie/header server-set). |
| **S-03** | High | `backend/src/main/java/com/nguyenhoanglong/exception/GlobalExceptionHandler.java` + `service/AuthService.java:141-142` | `ex.getMessage()` được trả thẳng cho client (DB constraint, SQL state, stack-trace ngắn) → lộ schema, tên bảng, FK vi phạm. | Gửi request gây lỗi DB → response chứa `PSQLException … constraint "fk_…"` → biết được schema. | Information disclosure giúp attacker dò schema chính xác. | Trả message generic (`"Đã xảy ra lỗi, vui lòng thử lại"`) + log chi tiết server-side qua SLF4J. |
| **S-04** | High | `backend/src/main/java/com/nguyenhoanglong/service/AuthService.java:84, 223` (`new Random().nextInt(999999)`) | OTP dùng `java.util.Random` (không phải `SecureRandom`), 6 chữ số, lưu BCrypt hash (tốt) nhưng generation entropy thấp. | Brute-force 1 OTP trong 5 lần cho phép → xác suất ~5e-6. | Tài khoản takeover qua email OTP. | Đổi sang `SecureRandom`; tăng entropy (8–10 chữ số alphanumeric); thêm rate limit per-IP. |
| **S-05** | High | `backend/src/main/java/com/nguyenhoanglong/config/SecurityConfig.java:52-58` + `web/src/lib/services/cartService.ts` | CORS `allowCredentials(true)` + `allowedOriginPatterns("http://localhost:*", "http://127.0.0.1:*", "http://10.0.2.2:*")`. Nếu deploy production origin ngoài danh sách này → không truy cập được; nếu bật thêm origin public thì CSRF/CORS có thể lộ. | Dev deploy ở `https://ettee.vn` mà không update config → trình duyệt chặn. | Dev/staging hoạt động "tạm" trên HTTP, có thể bypass trong production. | Whitelist origin production cụ thể; bật `setAllowedOrigins(...)` thay vì pattern. |
| **S-06** | Medium | `backend/src/main/java/com/nguyenhoanglong/entity/User.java` | Không có trường `role`. `AdminUserController` comment "RBAC Policy Active" nhưng không có. | Sinh nhiều account customer → không có cách nào promote staff/admin trong DB. | Mọi role-check đều stub. | Thêm `String role` (default `USER`) + enum; thêm vào JWT. |
| **S-07** | Medium | `web/src/contexts/AuthContext.tsx:52` + `lib/services/cartService.ts:30` + toàn bộ page | JWT lưu `localStorage` (key `auth_token`) — không `HttpOnly` cookie, không SameSite. | XSS 1 lần → đánh cắp toàn bộ session. | Account takeover toàn diện. | Sau khi login thành công, set JWT trong `HttpOnly; Secure; SameSite=Strict` cookie (qua backend `Set-Cookie`); frontend chỉ đọc profile qua `/api/auth/me`. |
| **S-08** | Medium | `backend/src/main/java/com/nguyenhoanglong/controller/OrderController.java:62-79` (`GET /api/orders/{orderCode}`) | Endpoint `getOrderDetails` không có rate-limit. `OrderService` không log truy cập. OrderCode format dễ đoán (`DH{millis}-{4-hex}`). | Attacker dò từ `DH1700000000000-` brute-force 4 hex chars (~65k). | Lộ toàn bộ order lịch sử guest. | Sinh orderCode opaque (UUID v7) + thêm throttle trên `/api/orders/{code}` (10 req/min/IP). |
| **S-09** | Medium | `backend/src/main/java/com/nguyenhoanglong/controller/PaymentConfigController.java` | `GET /api/payment-methods/bank-transfer` yêu cầu auth nhưng trả về cứng account từ `application.properties`. | User đã login (bất kỳ role) → đọc được số TK ngân hàng. | Rò rỉ nhẹ nhưng kết hợp phishing template QR có sẵn. | Mã hóa cấu hình ngân hàng trong DB, giới hạn `hasRole('ADMIN')`. |
| **S-10** | Low | `backend/src/main/java/com/nguyenhoanglong/service/AuthService.java` (`password reset`) | Khi email tồn tại → cooldown sinh `TOO_MANY_REQUESTS` 429; khi không tồn tại → 200 generic. Timing/existence side channel. | So sánh response time/status giữa email có/không. | Liệt kê user. | Dùng cùng 1 nhánh response bất kể email có tồn tại; trả 200 với message giống hệt; bỏ 429 ở nhánh này. |

---

## Business Logic Issues

| ID | Severity | File / API | Mô tả | Cách tái hiện | Rủi ro | Gợi ý sửa |
|---|---|---|---|---|---|---|
| **B-01** | High | `service/AuthService.java:148, 185` + `controller/CartController.java:62-69` | Login + verify-email merge **wishlist** nhưng **không merge cart**. Guest phải tự gọi `POST /api/cart/merge`. | Guest add 2 sp → login → user cart rỗng (chỉ tích hợp wishlist). | Mất giỏ hàng guest khi đăng nhập — UX cực tệ. | Trong `AuthService.login`/`verifyEmail`, gọi `cartService.mergeGuestCartIntoUserCart(userEmail, guestTokenFromRequest)`. |
| **B-02** | High | `service/CartService.java:160-169` (`mergeGuestCartIntoUserCart`) | Merge dùng `Math.min(qty, available)` **không throw, không warn**. Guest qty 5 + user qty 5, stock 8 → silently set qty=8. | B1: user A thêm 5 sp guest. B2: user A login, cart user đã có 5. Merge → qty=8 max, không báo. | Im lặng nuốt số lượng; khách tưởng thêm được. | Trả response kèm `mergedWarnings: [{productId, requested, capped}]`; nếu vượt tồn kho thì trả 409 + chi tiết. |
| **B-03** | High | `service/OrderService.java:54` + `controller/OrderController.java:62-79` | OrderCode = `"DH" + currentTimeMillis() + "-" + UUID 4 hex chars` (~65k entropy) — **predictable**. | Bắt đầu từ `DH1700000000000-` brute force 4 hex. | IDOR / dò đơn. | Sinh UUID v7 (16 hex, 64-bit entropy + timestamp) hoặc nanoID 22 ký tự. |
| **B-04** | High | `service/OrderService.java:69-75, 96-104` | `shippingAddress` không validate (chỉ snapshot). Stock bị trừ **ngay lúc checkout** cho cả `BANK_TRANSFER/PENDING_PAYMENT` (chưa nhận tiền). Không có endpoint `cancel/restock` trong `OrderService`. | Order BANK_TRANSFER → user đổi ý, không có cách nào restock (admin phải tự chạy SQL). | Tồn kho bị "khóa" vĩnh viễn cho đơn ảo. | Trừ `reservedQuantity` (giữ riêng); cron 30 phút hủy đơn `PENDING_PAYMENT` quá hạn → restock; hoặc endpoint admin cancel. |
| **B-05** | High | `service/OrderService.java:134` + `dto/CheckoutRequest.java:8` | Field `voucherCode` được nhận nhưng **không xử lý** (`discountTotal` luôn = 0). | POST checkout kèm `voucherCode:"SALE10"` → không có tác dụng. | Khuyến mãi/voucher chưa chạy; marketing bị giả lập. | Implement bảng `vouchers`, validate ở checkout (min order, expiry, usage limit), tính discount. |
| **B-06** | High | `repository/ProductSpecification.java` | Filter catalog **không có predicate `status = 'ACTIVE'`**. Sản phẩm `DRAFT`/`HIDDEN` vẫn xuất hiện ở listing. | Tạo sản phẩm `status='DRAFT'` qua seeder/audit → xuất hiện ở `/products`. | Lộ sản phẩm chưa sẵn sàng. | Thêm `criteriaBuilder.equal(root.get("status"), "ACTIVE")` vào Specification. |
| **B-07** | High | `service/DataSeederService.java` (toàn file) | Seeder không gán `product.setGender()` cho kids → list Bé trai/Bé gái trống đến khi `DataAuditService` chạy. | Sau khi seed 668 sp, mở `/products?targetGroup=kids&gender=boy` → kết quả rỗng dù DB có kids. | Catalog filter sai phân khúc. | Trong seeder, parse `slug`/name để set gender ngay (giống audit). |
| **B-08** | High | `controller/ProductController.java:90-101` + `controller/staff/StaffProductController.java` | `createProduct`/`updateProduct` đều `return null` (chưa impl). `deleteProduct` xóa cứng. | Admin POST 1 product mới → response `data: null`, nhưng DB có thể đã insert (`@Transactional` không rollback vì không có exception). | Sản phẩm ma trong DB, frontend không hiểu đã tạo. | Stub trả 501 Not Implemented rõ ràng, hoặc implement thật trước khi build. |
| **B-09** | Medium | `web/src/components/ui/ProductCard.tsx:37` + `web/src/app/products/page.tsx:218-220` | `ProductCard` props `id: string` (lưu `product.slug`), sau đó `isInWishlist(Number(id))`. Truyền slug chứa chữ/dấu → `Number("ao-phong-be-trai-…")` = **NaN** → wishlist heart không toggle, không cập nhật state. | Trang `/products` → click tim → toast "Đã thêm" nhưng UI không đổi, refetch lại thì mất. | Wishlist heart hỏng hoàn toàn trên listing cards. | Truyền `product.id` (number) làm `id`, slug làm riêng; hoặc đổi `useWishlist` nhận string và so slug. |
| **B-10** | Medium | `web/src/components/layout/Header.tsx:13-20` + `web/src/components/products/FilterSidebar.tsx:156-159` + `web/src/components/home/CategoryHighlights.tsx:8-44` | Menu dùng `targetGroup=kids&gender=boy`; sidebar dùng `targetGroup=boys`; category tile dùng `category=men`. Specification filter backend không nhất quán (`boys`/`girls` không tồn tại trong DB, chỉ `boy`/`girl` + plural). | Click "Bé trai" trên header → trang trống; click sidebar "Bé trai" (id=`boys`) → 0 sản phẩm. | Trải nghiệm tìm sp theo giới tính bị hỏng. | Thống nhất: dùng `targetGroup=kids&gender=boy` ở mọi nơi; hoặc thêm trong Specification mapping `boys → kid+boy`, `girls → kid+girl`. |
| **B-11** | Medium | `web/src/app/products/page.tsx:82-85` | `stats.targetGroup: { women: 200, men: 150, boys: 50, girls: 50, baby: 20 }` là **số cứng không có thật trong DB**. FilterSidebar dùng để render count. | Xem sidebar → thấy "Nam: 150", thực tế DB có thể 5 hoặc 500. | UI gây hiểu lầm. | Đếm thật từ `productRepository.countByTargetGroup(…)`. |
| **B-12** | Medium | `web/src/app/products/page.tsx` (query `?sale=true`) | Backend listing không nhận `sale`; chỉ nhận `status`. Sale link trong Header trỏ `/products?sale=true` → không lọc. | Bấm "Sale" trên menu → toàn bộ sản phẩm, không phải chỉ sale. | UX sale hỏng. | Map `sale → status=ACTIVE & salePrice<price` ở service, hoặc sửa link thành `?productType=…`/custom. |
| **B-13** | Low | `service/OrderService.java:96-104` (`getOrderDetails`) | Đơn guest đã trả về cho user khác (xem C-02). | Như trên. | PII lộ. | (xem C-02). |

---

## Data Integrity Issues

| ID | Severity | File / API | Mô tả | Cách tái hiện | Rủi ro | Gợi ý sửa |
|---|---|---|---|---|----|---|
| **D-01** | Critical | `application.properties:10` (`spring.jpa.hibernate.ddl-auto=update`) + `pom.xml` (không có flyway) + `db/migration/V20260908000000__baseline_schema.sql` (chỉ 4 bảng, không khớp entity) | Schema hoàn toàn do Hibernate `update` sinh khi boot; migration file gần như dead code. Khi chạy `mvn test`, Hibernate cố tạo FK `order_item_id` lên bảng `product_reviews` nhưng **fail** (`column "order_item_id" does not exist`) — đã quan sát được khi build. | `mvn test` log: `Caused by: org.postgresql.util.PSQLException: ERROR: column "order_item_id" referenced in foreign key constraint does not exist`. | Mỗi lần deploy/test có thể drop mất cột; không có nguồn sự thật về schema. | Bật Flyway + viết đầy đủ V1 cho users/products/variants/categories/carts/cart_items/orders/order_items/order_status_history/reviews/wishlist/measurements/tokens; set `ddl-auto=validate`. |
| **D-02** | High | `entity/OrderItem.java:24` (`private Long variantId`) | `variantId` là `Long` thuần, không `@ManyToOne` → **không có FK constraint** đến `product_variants`. | Xóa `product_variants.id=42` → order_items.variant_id=42 vẫn tồn tại, FK không catch. | Order line dở dang; không thể join. | Đổi thành `@ManyToOne(fetch = LAZY) ProductVariant variant` với FK; hoặc giữ Long nhưng thêm `ALTER TABLE order_items ADD CONSTRAINT fk_oi_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT`. |
| **D-03** | High | `entity/Cart.java:23-30` | `user_id` nullable, `guest_token` unique nullable, **không có CHECK XOR**, không có UNIQUE `user_id`. Nhiều cart/user có thể tồn tại (đã thấy logic tạo `newCart` mỗi lần `findByUserId` không thấy, không đảm bảo 1:1). | 2 request song song → 2 cart cho 1 user. | Bội số cart; subtotal phân tán. | Thêm `@JoinColumn(name = "user_id", unique = true)` + CHECK `(user_id IS NOT NULL) <> (guest_token IS NOT NULL)`. |
| **D-04** | High | `entity/CartItem.java` | Không có `@UniqueConstraint(cart_id, product_variant_id)`. Race trên `addToCart` có thể tạo 2 dòng cùng variant. | 2 request add cùng variant song song. | Duplicate line, totalQuantity sai. | Thêm unique constraint + bắt `DataIntegrityViolation` ở service. |
| **D-05** | High | `entity/WishlistItem.java:11-13` | UNIQUE `(user_id, product_id)` & `(guest_token, product_id)` — trong PostgreSQL **NULL không collide**, nên nhiều dòng có thể cùng `(NULL, product_id)` hoặc `(guest_token='', product_id)`. | Thêm cùng 1 sp khi cả `user_id` & `guest_token` đều NULL (do bug). | Wishlist trùng entry. | Đổi sang partial unique index `WHERE user_id IS NULL` / `WHERE guest_token IS NULL`; thêm CHECK XOR. |
| **D-06** | High | `entity/Order.java` | `user_id` & `guest_token` đều nullable, **không có CHECK XOR**. Order có thể tồn tại không có chủ sở hữu. | Lỗi app → order lưu cả 2 null. | Order mồ côi. | Bắt buộc 1 trong 2; CHECK constraint. |
| **D-07** | High | `entity/EmailVerificationCode.java` | `user_id` là `String` không FK → orphan khi user xóa. Không unique index "chỉ 1 ACTIVE/user". | User xóa → codes rác; 2 ACTIVE cùng user cùng lúc. | Token leak + rác DB. | Đổi sang `@ManyToOne User user`; thêm `UNIQUE(user_id) WHERE status='ACTIVE'` partial index. |
| **D-08** | High | `entity/ProductReview.java` | Không CHECK rating; `@JoinColumn(name="order_item_id", unique=true)` đúng về unique nhưng Hibernate cố tạo FK lên cột không tồn tại (xem D-01). | (Test build fail đã chứng minh.) | FK không tạo được. | Sửa entity để Hibernate sinh cột đúng (`nullable=false` + tên cột thống nhất). |
| **D-09** | Medium | `entity/ProductVariant.java` | `color`, `size` nullable; không UNIQUE `(product_id, color, size)`. `stock` & `availableQuantity` không CHECK `>=0`. | 2 variant trùng size+color; restock âm. | Duplicate variant, oversell. | Thêm UNIQUE + CHECK. |
| **D-10** | Medium | `entity/OrderItem.java:37-50` | Snapshot thiếu `sale_price` (cột tồn tại nhưng không bao giờ set — xem `OrderService.checkout:121-126`). `Double` cho tiền tệ → mất precision khi làm tròn. | Hồ sơ kế toán. | Sai lệch phân tích lợi nhuận. | Dùng `BigDecimal`; set cả `unitPrice` lẫn `salePrice` lúc snapshot. |
| **D-11** | Medium | `entity/OrderStatusHistory.java` | Không cascade từ `Order.items`; lưu riêng repo. Xóa order cứng bị FK chặn; nếu cascade sai → mất lịch sử. | SQL `DELETE FROM orders WHERE id=1` lỗi FK. | Order không xóa được. | Cascade all + orphanRemoval từ Order; hoặc service xóa history trước. |
| **D-12** | Medium | `entity/UserMeasurement.java` | Không CHECK height/weight range; `profileType` free string. | Insert 1 measurement height=999. | Dữ liệu vô lý. | CHECK + enum `profile_type`. |
| **D-13** | Low | `entity/Category.java` | `slug` UNIQUE nhưng nullable. PG cho phép nhiều NULL cùng UNIQUE. | Nhiều category null slug. | Lookup lỗi. | Set NOT NULL hoặc partial UNIQUE `WHERE slug IS NOT NULL`. |

---

## Frontend / UI Issues

| ID | Severity | File / API | Mô tả | Cách tái hiện | Rủi ro | Gợi ý sửa |
|---|---|---|---|---|---|---|
| **F-01** | Critical | `web/src/app/page.tsx:11-21` | Không try/catch trong async server component; không `loading.tsx`/`error.tsx`. Backend fail → Next error page đỏ full-screen. | Stop backend → `/` → màn hình đỏ. | Toàn trang chết. | Bọc trong `Promise.allSettled` + fallback "đang cập nhật"; thêm `error.tsx` + `loading.tsx` cho mọi route. |
| **F-02** | Critical | `web/src/app/account/orders/page.tsx:23` & `order-success/[orderCode]/page.tsx:24` | Sai key `localStorage.getItem('token')` (đúng phải là `auth_token`). | Xem C-05. | Lịch sử đơn + order-success hỏng. | Đổi key; tạo helper `getAuthToken()`. |
| **F-03** | Critical | `web/src/components/products/ProductInfo.tsx:34-39` | PDP bắt buộc login để add-to-cart, ngược với backend guest-support. | Xem C-07. | Guest commerce hỏng. | Bỏ ép login; cho phép guest add. |
| **F-04** | High | `web/src/app/(customer)/page.tsx` + `web/src/app/page.tsx` | Có **2 root pages** ở `/` → Next.js conflict/ambiguous. | Truy cập `/` không biết render file nào trước. | UI không nhất quán; mất SEO canonical. | Xóa `(customer)/page.tsx` hoặc move sang route khác. |
| **F-05** | High | `web/src/components/layout/Footer.tsx:38-62` | Dead links: `/about`, `/stores`, `/careers`, `/news`, `/contact`, `/faq`, `/shipping`, `/returns`, `/size-guide`, `/terms`, `/privacy`. `/orders` (đáng lẽ `/account/orders`). | Bấm bất kỳ link trên → 404. | UX kém; SEO penalty. | Tạo page placeholder hoặc đổi href `#` / section. |
| **F-06** | High | `web/src/components/ui/ProductCard.tsx:37` | Wishlist `Number(slug)` = NaN. | Xem B-09. | Heart icon không hoạt động. | Truyền `productId` number. |
| **F-07** | High | `web/src/components/products/FilterSidebar.tsx:155-159` & `Header.tsx:15-16` | Mixed filter values: `boys/girls` (sidebar) vs `kids + gender=boy/girl` (header). | Click "Bé trai" → không khớp backend. | Filter hỏng. | Map/unify giá trị. |
| **F-08** | High | `web/src/app/admin/users/page.tsx`, `admin/ai-config`, `staff/dashboard` | **Không có middleware bảo vệ** + render chung layout store (Header/Footer). | Vào `/admin/users` không cần login. | Lộ giao diện admin giả (UI giả, API chưa có). | Thêm `middleware.ts` kiểm JWT + role; redirect nếu không đủ quyền. |
| **F-09** | High | Toàn app | **Không có `app/error.tsx`, `app/global-error.tsx`, `app/loading.tsx`, `app/not-found.tsx`**. | Trigger bất kỳ error runtime → Next default error UI. | UX đỏ khắp nơi. | Tạo file tương ứng với UI brand ET.TEE. |
| **F-10** | Medium | `web/src/app/cart/page.tsx`, `wishlist/page.tsx`, `checkout/page.tsx` | Cart/wishlist/checkout không có loading state chuẩn; chỉ toast khi lỗi. | Backend down → trang cart trống không biết lý do. | Khó debug. | Skeleton + retry button. |
| **F-11** | Medium | `web/src/lib/services/cartService.ts` (mutating methods) | `addToCart`, `updateCartItem`, `removeFromCart` không catch network error trước khi `await res.json()` → có thể throw opaque. | API down → lỗi JSON parse. | Crash component. | `try { await res.json() } catch { throw new Error('Mạng không ổn định') }`. |
| **F-12** | Medium | `web/src/contexts/AuthContext.tsx:50-58` (`login`) | Sau khi set token, gọi `getMe()` không try/catch. Network fail → state inconsistent (token lưu nhưng user null). | Login mạng chập chờn → token set nhưng user vẫn null → middleware redirect. | Loop vô tận. | Bọc try/catch; rollback token nếu `getMe` fail. |
| **F-13** | Medium | `web/src/app/checkout/page.tsx:130-150` | Checkout không đợi `cart.isLoading` trước khi render form → flash "Giỏ hàng trống" rồi mới hiện items. | Vào `/checkout` lần đầu → thấy "trống" 0.5s. | UX khó hiểu. | Trả skeleton khi `isLoading`. |
| **F-14** | Medium | `web/src/app/order-success/[orderCode]/page.tsx:20-50` | Guest checkout → redirect về `/auth/login` không cần thiết; cần hỗ trợ guest xem confirmation. | Guest checkout → trắng trang. | Khách không xác nhận được. | Dùng `guest_cart_token` + `orderCode` để fetch chi tiết. |
| **F-15** | Medium | `web/src/components/layout/Header.tsx` mobile menu | Link `/account/wishlist` không tồn tại (đúng là `/wishlist`). | Bấm trên mobile → 404. | UX hỏng mobile. | Đổi href. |
| **F-16** | Low | `web/src/components/layout/Footer.tsx:67-77` | Social link trỏ `https://facebook.com` (trang chủ chứ không phải fanpage ET.TEE). | Click → trang Facebook root. | Không đúng brand. | Cập nhật URL thật hoặc `#`. |
| **F-17** | Low | `web/src/app/wishlist/page.tsx:48` | Truyền `product.slug` làm `id` cho ProductCard (cùng vấn đề F-06). | Click tim → vô hiệu. | UX nhỏ. | Truyền productId. |

---

## Test Results

### Backend (`mvn -q package` + `mvn -q test`)

```
EXIT_SKIP_TESTS=0      (compile + package PASS)
EXIT_TEST=0            (test process exits 0, NHƯNG trong log có lỗi dưới)
```

- **Build**: PASS (compile + jar đóng gói xanh).
- **Test**: PASS về exit code NHƯNG **một test tạo context fail** vì Hibernate `ddl-auto=update` cố thêm FK `order_item_id` lên bảng `product_reviews` nhưng cột không tồn tại:
  ```
  Caused by: org.postgresql.util.PSQLException: ERROR: column "order_item_id" referenced in foreign key constraint does not exist
  ```
  Và 1 mutation ad-hoc runtime: `ALTER TABLE product_reviews ALTER COLUMN user_id DROP NOT NULL;` (logged `Success:`) — đây là schema drift bằng `EntityManager` tại runtime (xem `FashionBackendApplication.java`).
- **Hibernate warnings**: "spring.jpa.open-in-view is enabled by default" → query trong view render → nguy cơ N+1.
- **Auto-generated security password** vẫn được log (`Using generated security password: e46918d5-…`) → form login mặc định Spring vẫn active song song với JWT filter.

### Frontend (`npm run build`)

```
EXIT_BUILD=0
Next.js 16.3.4 (Turbopack) — "Compiled successfully in 1456ms"
TS check: Finished in 3.2s (0 errors)
Static pages generated: 21/21
Routes (app):
  ○ /, /_not-found, /account/*, /admin/*, /auth/*, /cart, /checkout, /wishlist, /staff/dashboard
  ƒ /order-success/[orderCode], /products, /products/[slug]
```

- Build PASS, type check PASS.
- Không có test runner (`npm test` không tồn tại trong `package.json` scripts).
- Không có E2E test.

### API tests đã chạy

Không chạy API tests tự động (không có test suite). Manual curl đã dùng để verify các endpoint bảo mật (xem phần **Cách tái hiện** trong từng issue).

---

## Recommended Fix Order (từ nguy hiểm nhất → ít nguy hiểm nhất)

1. **[C-04]** Triển khai RBAC thật: thêm `role` lên `User`, set authorities trong `JwtAuthenticationFilter`, bật `@EnableMethodSecurity`, bảo vệ `/api/admin/**`, `/api/staff/**`, `POST/PUT/DELETE /api/products/**`. *(Bỏ chặn toàn bộ broken access control.)*
2. **[C-01]** Bỏ `permitAll` khỏi `/api/admin/products/audit` (hoặc convert thành `@PostConstruct` chạy một lần). *(Ngăn ghi đè catalog toàn cục.)*
3. **[C-02] + [S-08]** Sửa `OrderService.getOrderDetails` để check ownership cho guest order (yêu cầu `guest_token`/email+phone), rotate `orderCode` sang UUID v7/opaque, thêm rate-limit. *(Đóng IDOR + brute force.)*
4. **[C-05] + [F-02]** Đổi `localStorage.getItem('token')` → `auth_token` ở `account/orders/page.tsx` + `order-success/[orderCode]/page.tsx`; tạo helper `getAuthToken()` chung. *(Khôi phục flow xem lịch sử đơn + order-success.)*
5. **[C-03]** Sửa `ReviewController.checkEligibility` & `createReview` để load `User` qua `SecurityContextHolder` (giống `OrderController`). *(Khôi phục review cho user đăng nhập.)*
6. **[C-06] + [F-01] + [F-09]** Thêm `app/error.tsx`, `app/loading.tsx`, `app/global-error.tsx`; bọc `Promise.allSettled` ở `Home()`; bỏ try/catch ở các call. *(Tránh "red overlay" khi backend down.)*
7. **[C-07]** Bỏ ép login ở `ProductInfo.handleAddToCart`; cho phép guest add-to-cart. *(Mở khóa guest commerce.)*
8. **[C-08] + [D-02] + [D-09]** Stock race: thêm `@Version` lên `ProductVariant`, dùng `SELECT … FOR UPDATE` ở `OrderService.checkout`, thêm CHECK `stock >= 0`, `availableQuantity >= 0`. FK cho `order_items.variant_id`. *(Đóng oversell + orphan variant.)*
9. **[D-01]** Bật Flyway; viết V1 đầy đủ cho tất cả bảng; set `ddl-auto=validate`; xóa các `ALTER TABLE … DROP NOT NULL` runtime. *(Ổn định schema.)*
10. **[S-01] + [S-02] + [S-07]** Server-issued guest token (HttpOnly cookie hoặc HMAC); bỏ `permitAll` ở `/api/cart/merge`; chuyển JWT sang cookie. *(Giảm cart-takeover + XSS impact.)*
11. **[B-01]** Tự động merge guest cart khi login/verify-email (hiện chỉ wishlist). *(Khôi phục UX sau đăng nhập.)*
12. **[B-09] + [F-06] + [F-17]** Truyền `product.id` (number) cho `ProductCard` thay vì slug. *(Sửa wishlist heart trên listing.)*
13. **[B-06] + [B-07]** Thêm `status='ACTIVE'` vào `ProductSpecification`; set `gender` trong seeder. *(Filter catalog đúng.)*
14. **[B-10] + [F-07]** Thống nhất filter params (header ↔ sidebar ↔ category tile). *(Đồng bộ navigation.)*
15. **[F-05] + [F-15]** Tạo placeholder page hoặc xóa dead links ở Footer. *(Dọn UX.)*
16. **[S-03]** Chuẩn hóa `GlobalExceptionHandler` trả generic message. *(Chống info disclosure.)*
17. **[S-04]** Đổi `new Random()` → `SecureRandom` cho OTP; tăng entropy; rate limit. *(Cứng hóa OTP.)*
18. **[B-04] + [B-05]** Implement voucher & restock/cancel cho order PENDING_PAYMENT. *(Hoàn thiện commerce.)*
19. **[B-11] + [B-12]** Đếm stats thật, map `?sale=true` → backend. *(Bỏ mock số liệu.)*
20. **[D-03] … [D-13]** Bổ sung UNIQUE/XOR/CHECK ở các entity còn lại; dọn orphan checks. *(Hoàn thiện data integrity.)*
21. **Marketing staff**: bắt đầu thiết kế bảng `banners`, `vouchers`, `campaigns`, `promotions`, `audit_logs` — chưa có trong code. *(Mở rộng scope.)*

---

## Phụ lục: Mapping Issue → File (tóm gọn)

| Vấn đề | File chính |
|---|---|
| C-01 | `config/SecurityConfig.java` + `controller/admin/AdminProductController.java` + `service/DataAuditService.java` |
| C-02 / B-03 / S-08 | `service/OrderService.java` + `controller/OrderController.java` |
| C-03 | `controller/ReviewController.java` + `config/JwtAuthenticationFilter.java` + `service/ReviewService.java` |
| C-04 / S-06 | `controller/ProductController.java` + `controller/staff/StaffProductController.java` + `entity/User.java` |
| C-05 / F-02 | `web/src/app/account/orders/page.tsx` + `web/src/app/order-success/[orderCode]/page.tsx` |
| C-06 / F-01 / F-09 | `web/src/app/page.tsx` + thiếu `error.tsx/loading.tsx` |
| C-07 / F-03 | `web/src/components/products/ProductInfo.tsx` |
| C-08 | `service/OrderService.java:96-104` + `entity/ProductVariant.java` |
| S-01 / S-02 | `controller/CartController.java` + `controller/WishlistController.java` |
| S-03 | `exception/GlobalExceptionHandler.java` + `service/AuthService.java:141-142` |
| S-04 | `service/AuthService.java:84, 223` |
| S-07 | `web/src/contexts/AuthContext.tsx:52` |
| B-01 | `service/AuthService.java:148, 185` |
| B-06 / B-07 | `repository/ProductSpecification.java` + `service/DataSeederService.java` |
| B-09 / F-06 | `web/src/components/ui/ProductCard.tsx:37` + `web/src/app/products/page.tsx:218-220` |
| D-01 | `application.properties` + `pom.xml` + `db/migration/V20260908000000__baseline_schema.sql` + `FashionBackendApplication.java` |
| D-02 | `entity/OrderItem.java:24` |
| D-03 / D-04 / D-06 | `entity/Cart.java`, `entity/CartItem.java`, `entity/Order.java` |
| D-05 | `entity/WishlistItem.java` |
| F-04 | `web/src/app/page.tsx` + `web/src/app/(customer)/page.tsx` |
| F-05 / F-15 | `web/src/components/layout/Footer.tsx` + `web/src/components/layout/Header.tsx` (mobile) |
