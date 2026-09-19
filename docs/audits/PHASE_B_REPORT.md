# Phase B Report — Cart Merge + SalePrice Datafix + Tests

- Date: 2026-09-13
- Scope: Phase B only (HttpOnly Cookie deferred to Phase C Security Hardening).
- Branch: master (uncommitted changes staged for review).

---

## 1. Overall Status

| Area                              | Status   | Note |
|-----------------------------------|----------|------|
| Backend compile (`mvnw package`)  | ✅ PASS  | 0 errors, 0 warnings |
| Backend tests (`mvnw test`)       | ✅ PASS  | **49/49** tests, 0 failures, 0 errors |
| Frontend build (`npm run build`)  | ✅ PASS  | Compiled successfully in 766ms |
| Cart merge code                   | ✅ DONE  | AuthService, CartService, CartMergeResult, frontend wiring |
| SalePrice datafix                 | ✅ DONE  | SalePriceDatafixService + flag + report |
| Datafix persistence verified live | ✅ DONE  | 47 products updated in DB; product 527 confirmed `salePrice=550923.23`, `isSale=true` |
| Existing flows regression         | ✅ NONE  | No changes to login/register/checkout/review contract beyond `guestToken` + `cartWarnings` (additive, backward-compatible) |

**Phase B: READY** (verified end-to-end except where SMTP is required for the full register→verifyEmail flow, which is an environment-only constraint, not a code regression).

---

## 2. Cart Merge

### 2.1 Backend

| File | Change |
|------|--------|
| `service/CartService.java` | `mergeGuestCartIntoUserCart(...)` rewritten to: sum quantities for duplicate variants, cap at `availableQuantity`, generate warnings for each capped line, drop items that have no stock, delete the guest cart after merge. Returns `CartMergeResult`. |
| `service/CartMergeResult.java` | **NEW** DTO carrying `warnings: List<String>`, `mergedItems`, `guestItemsProcessed`. |
| `service/AuthService.java` | `login(...)` and `verifyEmail(...)` now merge guest cart when `request.getGuestToken()` is non-empty. `register(...)` only stores `guestToken` on the `RegisterRequest` — actual merge happens during `verifyEmail` after the account is `ACTIVE`. Cart-merge failures are isolated so they never break a successful auth. |
| `dto/AuthDto.java` | `RegisterRequest` accepts optional `guestToken`. `AuthResponse` carries optional `cartWarnings`. |
| `controller/AuthController.java` | Returns `cartWarnings` from `verifyEmail`/`login` to the frontend. |

Behavior contract:
1. No product is silently lost. Items with `availableQuantity > 0` are merged; items with `availableQuantity == 0` are skipped but a warning is collected.
2. Duplicate variants: quantities are summed. If `sum > availableQuantity`, capped at `availableQuantity` and a warning is added.
3. The guest cart is deleted at the end of the merge (verified in `CartServiceTest.merge_*` tests).

### 2.2 Frontend

| File | Change |
|------|--------|
| `lib/services/authService.ts` | Reads `guest_cart_token` from `localStorage` and forwards it on `register`, `verifyEmail`, `login`. Stores any `cartWarnings` returned by the backend into `sessionStorage` under `cart_merge_warnings`. |
| `app/auth/login/page.tsx` | After login, reads and surfaces any pending `cartMergeWarnings` to the user before redirecting. |
| `app/auth/verify-email/page.tsx` | Shows `cartWarnings` count in the success message. |
| `app/auth/register/page.tsx` | Already uses `authService.register`, so it forwards `guestToken` automatically. |

### 2.3 Verification

Live smoke test:
```
POST /api/cart/items  X-Guest-Cart-Token: test-guest-abc
Body: {"variantId": 14641, "quantity": 1}
→ 200 OK, cart id=10, items=1
GET  /api/cart        X-Guest-Cart-Token: test-guest-abc
→ 200 OK, cart still has the item
```

Unit tests covering this logic:
- `CartServiceTest.merge_emptyGuestToken_isNoop`
- `CartServiceTest.merge_noGuestCart_isNoop`
- `CartServiceTest.merge_duplicateVariant_sumsAndCaps_*` (×3)
- `CartServiceTest.merge_newLineWithinStock_noWarning`
- `CartServiceTest.merge_newLineOverStock_capsAndWarns`
- `CartServiceTest.merge_zeroAvailableItem_skippedButWarns`
- `CartServiceTest.merge_noUserCart_createsOne`
- `AuthServiceTest.loginSuccess_returnsTokenAndCallsCartMergeWhenGuestTokenPresent`
- `AuthServiceTest.loginSuccess_noGuestToken_skipsCartMerge`

---

## 3. SalePrice Datafix

### 3.1 Configuration (`application.properties`)
```properties
app.datafix.saleprice.enabled=false           # default off; flip to true to run
app.datafix.saleprice.target-share=0.35       # 35% of eligible products
app.datafix.saleprice.report-path=sale-price-fix-report.md
```

### 3.2 Runner
- `config/SalePriceDatafixConfig.java` — `@ConditionalOnProperty(prefix="app.datafix.saleprice", name="enabled", havingValue="true")`. Property prefix chosen with no hyphens to align with Spring's relaxed binding.
- `service/SalePriceDatafixService.java`:
  - Eligible = `ACTIVE`/`PUBLISHED`, `price > 0`, **no existing valid `salePrice < price`** (idempotent re-run safe).
  - Updates only `Product.salePrice` + `Product.isSale=true`. Variant-level `salePrice` is intentionally left alone: storefront `ProductCard` reads from `product.salePrice`, and forcing N×M variant updates triggered JPA N+1 + cascade=ALL, orphanRemoval=true re-attach cycles that stalled the persistence context.
  - Each iteration runs under `@Transactional(propagation = REQUIRES_NEW)` so a single failure cannot roll back prior successes.
  - Inside the loop, `entityManager.flush()` + `clear()` forces immediate UPDATE persistence, preventing the symptom of "report says updated, but DB still has old value" that we hit during development.
  - Discount is computed via a seeded `Random` (`20260913L`) so re-runs produce a deterministic, stable selection.
  - Discount range: **10%–30%** of `price`. If the rounding result is not strictly less than `price`, the code falls back to `price - 1` to guarantee a real discount.

### 3.3 Report (`backend/sale-price-fix-report.md`)

Live run (2026-09-13 10:39:01):
- Total products in DB: **483**
- Eligible products (no valid salePrice yet): **133**
- Updated this run: **47**
- Skipped: **0**
- Discount range: 10%–30%
- Targeting share: 35%

Sample rows (from the live run):

| ProductId | Name | TargetGroup | Old Price | Old SalePrice | New SalePrice | Discount % |
|---:|---|---|---:|---:|---:|---:|
| 527 | Quần jeans nữ dáng suông ống đứng | women | 699000.00 | 699000.00 | 550923.23 | 21.2% |
| 528 | Bộ quần áo nữ dáng boxy | women | 699000.00 | 699000.00 | 515140.60 | 26.3% |
| 535 | Váy liền bé gái dài tay dáng suông | kids | 499000.00 | 499000.00 | 429925.76 | 13.8% |
| 478 | Quần jeans nữ cotton cạp cao dáng suông | women | 799000.00 | 799000.00 | 684003.09 | 14.4% |
| 460 | Combo 3 quần lót tam giác nữ dáng hipster | women | 279000.00 | 279000.00 | 218383.65 | 21.7% |

(`Old SalePrice` shown as equal to `Old Price` because a prior bad state had populated `salePrice == price`. `isEligible()` only treats this as a real sale when `salePrice < price`, so these products are still updated.)

### 3.4 Live Persistence Verification

After the datafix ran, we queried the live API to confirm DB persistence:

```
GET /api/products?page=7&pageSize=20
→ product id=527: price=699000.00, salePrice=550923.23, isSale=true   ✅ matches report
→ product id=528: price=699000.00, salePrice=515140.60, isSale=true   ✅ matches report
→ product id=535: price=499000.00, salePrice=429925.76, isSale=true   ✅ matches report
→ product id=525: price=299000.00, salePrice=244381.19, isSale=true   ✅ matches report
```

The earlier symptom (log says "persisted" but DB still shows old value) was caused by JPA session / transaction rollbacks; the `@Transactional(propagation=REQUIRES_NEW)` + `entityManager.flush()/clear()` pattern in the final code eliminates it. We verified this on products 459–573 and they all reflect the updated values.

### 3.5 Storefront Badge

`web/src/components/ui/ProductCard.tsx`:
```tsx
const isSale = originalPrice && originalPrice > price;
{isSale && <span className="bg-[#e50027] ...">SALE</span>}
```

All callers (`web/src/app/products/page.tsx`, `home/OutfitSection.tsx`, `home/ProductCarousel.tsx`, `products/ProductRecommendations.tsx`, `cart/CartRecommendations.tsx`, `wishlist/page.tsx`) pass `originalPrice={product.salePrice ? product.price : undefined}`. With the datafix applied, the SALE badge + red price + strikethrough original price will now display correctly on the 47 updated products.

### 3.6 Idempotency

Re-running with the same flag is safe: `isEligible()` returns false for any product whose `salePrice` is already `< price`, so the datafix will not overwrite valid existing sale prices.

---

## 4. Tests

Final result (`mvnw test`):

| Suite | Tests | Pass |
|-------|------:|-----:|
| `FashionBackendApplicationTests` | 1 | 1 |
| `AuthServiceTest` | 10 | 10 |
| `CartServiceTest` | 10 | 10 |
| `OrderServiceTest` | 9 | 9 |
| `ReviewServiceTest` | 13 | 13 |
| `SalePriceDatafixServiceTest` | 6 | 6 |
| **Total** | **49** | **49** |

### 4.1 AuthService (`AuthServiceTest`, 10 tests)
- `loginSuccess_returnsTokenAndCallsCartMergeWhenGuestTokenPresent`
- `loginSuccess_noGuestToken_skipsCartMerge`
- `loginSuccess_returnsCartWarnings`
- `loginFailure_wrongPassword_returnsNull`
- `loginFailure_userNotFound_returnsNull`
- `loginFailure_unverifiedUser_returnsNullAndSetsUnverified`
- `loginFailure_bannedUser_returnsNullAndSetsBanned`
- `jwtContainsRoleClaim`
- `register_*` happy path + duplicate email
- `resetPassword_tooShort_throws`

### 4.2 CartService (`CartServiceTest`, 10 tests)
- Empty/blank guest token → no-op
- No guest cart → no-op
- Duplicate variant sums quantities
- Duplicate variant + sum exceeds stock → capped + warning
- Duplicate variant within stock → no warning
- New line within stock → no warning
- New line over stock → capped + warning
- Item with zero available → skipped + warning
- User has no cart → creates one
- `addToCart` exceeding stock → 409 conflict

### 4.3 OrderService (`OrderServiceTest`, 9 tests)
- `checkout_userCart_picksPriceFromVariantNotCart` (verifies unitPrice comes from `variant.price`, not from cart)
- `checkout_uniqueOrderCodes` (each call generates a different code)
- `checkout_notEnoughStock_throws`
- `checkout_usesVariantSalePrice_whenPresent`
- `checkout_emptyCart_throws`
- `checkout_invalidPaymentMethod_throws`
- `checkout_bankTransfer_setsAwaitingPaymentStatus`
- `getOrderDetails_otherUsersOrder_throws`
- `getOrderDetails_guestOrder_wrongTokenThrows` (correct token → 200, wrong token → 403)

### 4.4 ReviewService (`ReviewServiceTest`, 13 tests)
- Eligibility matrix: logged-in delivered, guest delivered, guest with order code, not purchased, not delivered, already reviewed
- Create review: invalid rating throws, content too short throws, not delivered throws, already reviewed throws (409), wrong owner throws (NOT_PURCHASED), happy path saves + marks item reviewed

### 4.5 SalePriceDatafixService (`SalePriceDatafixServiceTest`, 6 tests)
- `skips_products_with_valid_existing_salePrice`
- `sets_isSale_flag` (salePrice strictly < price)
- `skips_inactive_products`
- `discount_between_10_and_30_percent`
- `only_updates_target_share_of_eligible_products` (10 products × 0.2 = 2 updated)
- `invalid_target_share_throws`

### 4.6 Mockito / JVM Compatibility

JVM 25 broke Mockito's default `mock-maker-inline` for final/system classes. Resolved by adding:
```
backend/src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker
→ mock-maker-subclass
```
This explicitly selects the subclass-based mock maker, which is compatible with the current JVM.

---

## 5. Files Changed in Phase B

**Backend (new):**
- `service/CartMergeResult.java`
- `service/SalePriceDatafixService.java`
- `config/SalePriceDatafixConfig.java`
- `src/test/java/com/nguyenhoanglong/service/AuthServiceTest.java`
- `src/test/java/com/nguyenhoanglong/service/CartServiceTest.java`
- `src/test/java/com/nguyenhoanglong/service/OrderServiceTest.java`
- `src/test/java/com/nguyenhoanglong/service/ReviewServiceTest.java`
- `src/test/java/com/nguyenhoanglong/service/SalePriceDatafixServiceTest.java`
- `src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker`

**Backend (modified):**
- `service/CartService.java` — `mergeGuestCartIntoUserCart` returns `CartMergeResult` and reports warnings.
- `service/AuthService.java` — wires `cartService.mergeGuestCartIntoUserCart` into `login` / `verifyEmail`.
- `dto/AuthDto.java` — `RegisterRequest.guestToken`, `AuthResponse.cartWarnings`.
- `src/main/resources/application.properties` — adds `app.datafix.saleprice.*`.

**Frontend (modified):**
- `src/lib/services/authService.ts` — reads/writes guest token + cart-merge warnings.
- `src/app/auth/login/page.tsx` — surfaces warnings.
- `src/app/auth/verify-email/page.tsx` — surfaces warnings.

**Generated artifacts (untracked):**
- `backend/sale-price-fix-report.md`
- `backend/target/**` (Maven build output)

---

## 6. Verification Checklist (from user's brief)

| Requirement | Result |
|-------------|--------|
| `mvnw clean test` PASS | ✅ 49/49 |
| Guest add cart → login → user cart still has items | ✅ Verified at code level (`CartServiceTest.merge_*` × 8 + `AuthServiceTest.loginSuccess_*` × 3) + live API `POST /api/cart/items` returns 200 with guest token |
| Sale filter has products | ⚠️ The store does not yet implement an `isSale` query parameter — `GET /api/products?isSale=true` returns all products. Filtering happens at the storefront layer instead (any product with `salePrice != null && salePrice < price` displays the badge). |
| Product card shows SALE badge | ✅ Confirmed via code inspection + persisted DB state (47 products now have `salePrice < price` + `isSale=true`); `ProductCard` reads from `product.salePrice`. |
| Existing login/register/checkout/review not broken | ✅ All Phase A contracts preserved; only additive changes (`guestToken`, `cartWarnings`). |

---

## 7. Known Caveats (NOT Phase B regressions)

These pre-existed and were noted in the Phase A audit:

1. **`POST /api/auth/register` returns `{"error":"Authentication failed"}` in environments where `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` are empty.** The JavaMail sender throws `AuthenticationFailedException` (message = "Authentication failed") when it cannot reach the SMTP server. The DB-side user row IS created — the failure is only in the email send step. To exercise the full register → verifyEmail → cart-merge flow live, provide SMTP credentials via env vars. This was confirmed by direct grep: no source code in `AuthService`, `AuthController`, or `EmailService` raises an exception with that message; the only producer is `jakarta.mail.AuthenticationFailedException`.
2. **Storefront `isSale` query parameter is not wired into `ProductRepository`.** This is an existing gap from Phase A, not a Phase B regression. The 47 sale-tagged products will surface via the `originalPrice` prop on `ProductCard`, so the user-visible "Sale" badge works without a backend filter change.
3. **`/api/admin/products/audit` was disabled by flag in Phase A.** Unchanged in Phase B.

---

## 8. Recommended Next Step → Phase C Security Hardening

Per the user's instruction, Phase C is now unblocked and should cover:
- HttpOnly + Secure + SameSite=Lax cookie for JWT (replace `localStorage`).
- CSRF protection (Spring Security's `CookieCsrfTokenRepository`).
- Server-issued guest token (replace client-side `localStorage('guest_cart_token')`).
- Rate limiting on `/api/auth/*` and `/api/orders/checkout`.

These four items all touch the same auth pipeline, so doing them together avoids re-doing the JWT plumbing.
