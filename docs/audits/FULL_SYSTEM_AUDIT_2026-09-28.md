# ET.TEE SHOP — FULL SYSTEM AUDIT REPORT

**Date:** 2026-09-28
**Branch:** `chore/flyway-adoption` @ `2aa713b`
**Mode:** Phase 1 — read-only diagnosis. No code, schema, or migration was modified.
**Auditor stance:** independent. No prior report in `docs/audits/` was treated as evidence.

---

## 1. Executive Summary

The system is a Spring Boot 3.4.3 / Java 21 backend (49 controllers, 34 services, 55 tables) with a Next.js 16 / React 19 frontend (95 pages). It compiles, its 96 backend tests pass, and `npm run build` succeeds. **Those three facts prove far less than they appear to, and none of them cover the areas where the system is actually broken.**

The headline conclusion: **the Marketing Staff module is largely non-functional and, where it does render, it displays fabricated numbers.** The Marketing Analytics page contains zero network calls — every impression, click, CTR, revenue figure, campaign name, and voucher code on it is a hardcoded constant. The Marketing dashboard hardcodes five of its KPIs to `0`. The Campaigns, Posts, and Product-Placement pages call `/api/staff/marketing/**`, a URL namespace that **does not exist anywhere in the backend**; the Campaigns page catches the resulting failure and reports `"Chiến dịch đã được tạo thành công (Mock)"` to the user.

Separately, the order/inventory chain has two independent, unreconciled stock models, and stock is never returned to inventory when an order is cancelled.

| Metric | Count |
|---|---|
| **Confirmed** issues | 41 |
| **Likely** issues | 7 |
| **Suspected** issues | 4 |
| **Cannot verify** | 5 |
| P0 — Critical | 8 |
| P1 — High | 19 |
| P2 — Medium | 17 |
| P3 — Low | 8 |

**What is genuinely good** (stated because the brief asks for proof either way, not flattery): the COD reconciliation module (`ShippingService` + `CodReconciliationIntegrationTest`, 11 tests) has real shop isolation, duplicate-reconciliation guards at both the application and DB-constraint level, and a coherent DTO contract. The CSKH compensation-voucher system (`CskhExtendedServiceImpl`) enforces per-staff monthly quota, an allow-list of denominations, one-voucher-per-ticket, and customer binding — it is the best-engineered business logic in the repository. Checkout uses a genuine pessimistic row lock on `product_variants`. The RBAC permission catalogue is well-modelled. These are the exception, not the rule.

---

## 2. System Architecture Findings

**A-1. Two parallel, unsynchronised inventory models (root cause of six downstream defects).**
- `product_variants.stock` / `available_quantity` — written by customer checkout (`OrderService.checkout`).
- `inventories.quantity_on_hand` / `quantity_reserved` — written by warehouse and read by sales confirmation.

Nothing ever reconciles them. Checkout decrements variants; `SalesOrderService.validateInventoryForConfirmation` validates against `inventories`. An order can be accepted at checkout and then rejected at confirmation, or vice versa. See ORD-INV-001/002/003.

**A-2. `inventories` is keyed by `product_id` alone, not `(shop_id, product_id)`.** `InventoryRepository.findByProductIdWithLock(productId)` returns one global row. Multi-shop inventory is therefore not representable, yet `Inventory.shopId` exists and ownership checks are written against it — the checks pass or fail arbitrarily depending on which shop created the row first.

**A-3. Marketing is outside the shop model entirely.** `Voucher.shopId` and `Campaign` have no shop scoping in any marketing code path; `DataSeeder` seeds `marketing@et.tee` with `shopId = null` while every other staff role gets `shopId = 1`. Consequence: MKT-BIZ-001 (approval bypass) and MKT-SEC-002 (no cross-shop isolation).

**A-4. Three coexisting navigation systems** on every marketing page: `StaffSidebar` (from `role-navigation.config.ts`), `StaffHeader` breadcrumbs, and a page-local `MarketingNav`/`NAV_LINKS` pill bar duplicated verbatim in four files.

**A-5. A shared marketing design-system exists and is dead.** `src/components/staff/marketing/` contains `MarketingShell`, `MarketingSidebar`, `Form`, `Badge`, `Modal`, `ConfirmDialog`, `PageStates` (536 lines). `grep` across `src/` finds **zero importers**. Every marketing page hand-rolls its own shell, table, badge, and modal instead.

---

## 3. Role & Permission Audit

| Role | Authentication | Authorization | Shop Isolation | UI | API | Issues |
|---|---|---|---|---|---|---|
| CUSTOMER (`USER`) | OK | OK | n/a | OK | OK | AUTH-003, AUTH-004 |
| SALES_STAFF | OK | **Weak** — class-level `VIEW_NEW_ORDER` gates confirm/cancel/verify | Partial | OK | OK | SEC-RBAC-001, ORD-IDOR-001 |
| WAREHOUSE_STAFF | OK | **Weak** — class-level `INBOUND_STOCK` gates adjust + self-approve | **Broken** in 4 methods | OK | OK | SEC-RBAC-002, SEC-IDOR-002, WH-* |
| SHIPPING_STAFF | OK | **Weak** — class-level `MANAGE_WAYBILL` gates COD reconcile | **Good** | OK | OK | SEC-RBAC-003, SHIP-FIN-001 |
| CSKH_STAFF | OK | Good (`hasAnyRole`) | Good | OK | OK | — |
| MARKETING_STAFF | OK | Good (per-method `hasAuthority`) | **None** | **Broken** | **Partly missing** | entire §5 |
| SHOP_OWNER | OK | Good | Good | OK | OK | MKT-BIZ-001 (queue starved) |
| ADMIN | OK | Good | Bypass by design | OK | OK | SEC-AUTH-001 |
| STAFF (generic) | OK | `PRODUCT_VIEW` grants product **write** | n/a | OK | OK | SEC-RBAC-004 |

**Cross-cutting:** the RBAC fallback in `JwtAuthenticationFilter` makes permission revocation impossible — see SEC-RBAC-005.

---

## 4. Module-by-Module Findings

| Module | Functional | Logic | API | DB | Security | UI/UX |
|---|---|---|---|---|---|---|
| Auth / Session | Partial | Broken (no refresh, no 401) | Mismatch | OK | Weak | Partial |
| Catalog / Product | OK | OK | OK | OK | OK | OK |
| Cart | OK | OK | OK | OK | Acceptable | OK |
| Checkout / Order | Partial | **Broken** | OK | Risky (`double`) | OK | OK |
| Inventory / Warehouse | Partial | **Broken** | OK | **Broken** | **Broken** | OK |
| Shipping / COD | **Good** | Partial | OK | OK | **Good** | OK |
| CSKH / Tickets | **Good** | **Good** | OK | OK | **Good** | OK |
| **Marketing** | **Broken** | **Broken** | **Missing** | OK | Weak | **Broken** |
| Store Owner | OK | Partial | OK | OK | Good | Partial |
| Admin | OK | OK | OK | OK | OK | Partial |

---

## 5. MARKETING STAFF — DEDICATED AUDIT

This is the highest-severity area in the system. Seven pages, 3,274 lines of TSX. Findings below are all **Confirmed by source inspection**; the underlying endpoints were verified absent by exhaustive `grep` over `src/main/java`.

### 5.1 The missing API namespace

`grep -rn "staff/marketing" backend/src/main/java` returns **nothing**. No controller, no `@RequestMapping`, no alias maps `/api/staff/marketing/**`. Yet the frontend calls it nine times:

| File | Call | Backend reality |
|---|---|---|
| `marketing/page.tsx:99` | `GET /api/staff/marketing/campaigns?size=5` | **absent** (real: `GET /api/marketing/admin/campaigns`) |
| `campaigns/page.tsx:73` | `GET /api/staff/marketing/campaigns` | **absent** |
| `campaigns/page.tsx:89` | `POST /api/staff/marketing/campaigns` | **absent** |
| `campaigns/page.tsx:130` | `PUT /api/staff/marketing/campaigns/{id}/status` | **absent** (real: `PATCH /api/marketing/admin/campaigns/{id}/status`) |
| `campaigns/page.tsx` (delete) | `DELETE /api/staff/marketing/campaigns/{id}` | **absent** |
| `posts/page.tsx:110,184,211,241` | `/api/staff/marketing/posts*` | **absent — and no `Post` entity or table exists at all** |
| `product-placement/page.tsx:~120` | `GET /api/staff/marketing/placements?section=` | **absent** (real: `GET /api/marketing/admin/placements`) |

Because `/api/staff/**` is `.authenticated()` in `SecurityConfig` with no handler, these return 403/404 — and every call site swallows it.

### 5.2 Dashboard (`marketing/page.tsx`)

- **Five KPIs are hardcoded `0`.** Lines 118–127: `publishedPosts: 0, totalImpressions: 0, totalClicks: 0, avgCTR: 0, revenueFromPromo: 0`. The UI then renders them as `"0.0K"` lượt hiển thị, `"0%"` CTR, `"0₫"` doanh thu. `GET /api/marketing/admin/analytics/overview` returns exactly these five numbers and is **never called**.
- **"Chiến dịch đang hoạt động" is permanently empty** (dead endpoint, §5.1) and has **no empty state and no error state** — `loading ? spinner : campaigns.map(...)` over `[]` renders a bare white box. The `catch {}` block sets `campaigns: []` and shows nothing.
- **`activeCampaigns` is computed from a `size=5` page** — it would undercount even if the endpoint existed.
- **Two broken Tailwind class strings produce invisible UI.** Line ~160: `className="rounded-xl    hover: hover: px-5 py-2.5 ... text-white"` — `hover:` with no utility is invalid and there is no background utility, so the primary **"Tạo chiến dịch mới" button renders as white text on a white background**. Same defect in `QUICK_LINKS` (`accent: " "` → `rounded-xl  ${accent}` yields an icon tile with no background holding a `text-white` icon) and in the campaign row avatar.
- `getAuthHeaders()` is evaluated in the render body, not inside `load()`, so headers are captured once and go stale after any token change. `useCallback(load, [])` omits `baseUrl`/`authHeaders` from its deps.

### 5.3 Campaigns (`campaigns/page.tsx`)

- **Creation is a client-side lie.** `handleCreate` (lines 86–121): on failure it falls into `catch`, fabricates `{ id: 'camp-new-' + Date.now(), status: 'DRAFT' }`, pushes it into React state, and calls `toast.success("Chiến dịch đã được tạo thành công (Mock)")`. Since the endpoint does not exist, **this is the only path that ever runs**. The user is told the campaign was created; nothing is persisted; it disappears on refresh.
- **Contract mismatch even if the path were corrected.** The form posts `{ type: FLASH_SALE|SEASONAL|LOYALTY|REFERRAL, targetAudience: ALL|NEW_CUSTOMERS|RETURNING|VIP }`. The `Campaign` entity has **no `type` and no `targetAudience` column**; it has `code`, `goal`, `budget`, `isActive`. The frontend also types `id: string`; the entity uses `Long`.
- **No status-transition rules exist anywhere.** `MarketingService.updateCampaignStatus` and `updateVoucherStatus` accept **any string** and set `isActive = "ACTIVE".equals(status)`. `EXPIRED → ACTIVE`, `CANCELLED → ACTIVE`, and `status = "BANANA"` are all accepted. There is no campaign state machine (contrast: orders have `OrderStateMachine`).
- No date validation: `endDate` may precede `startDate` on both campaigns and vouchers.
- The status toggle updates React state optimistically **before** the request and only reverts via a full refetch in `catch`.

### 5.4 Vouchers (`vouchers/page.tsx`) — the one page wired to a real API

The page itself is correct: real endpoints (`/api/marketing/admin/vouchers`), real error toasts, real refetch after mutation, loading and empty states present. **The defects here are on the backend.**

- **MKT-BIZ-001 — the shop-owner approval workflow is completely bypassed.** `MarketingService.createVoucher` sets `status = "ACTIVE"` and `isActive = true` by default and **never sets `shopId`**. `StoreOwnerServiceImpl.getPendingApprovals` queries `voucherRepository.findPendingApprovalByShopId(shopId)` for status `PENDING`/`PENDING_APPROVAL`. A marketing-created voucher therefore (a) goes live to customers immediately and (b) can never appear in the queue, for two independent reasons. The `APPROVE_SHOP_PROMO` permission and the "Hàng đợi Phê duyệt" page are dead code for vouchers.
- **MKT-BIZ-002 — no value validation.** `createVoucher` checks only that `code`, `name`, and `discountValue` are non-null. A `PERCENT` voucher with `discountValue = 500` is accepted (capped at subtotal only at redemption); negative and zero values are accepted; `maxUses`, `perUserLimit` may be negative.
- **MKT-CONC-001 — voucher usage is a lost-update race.** `incrementVoucherUsage` does `voucher.setUsedCount(usedCount + 1); save(...)` — a read-modify-write with no lock, no `@Version`, and no atomic `UPDATE ... SET used_count = used_count + 1`. Validation and increment also straddle separate transactions. `maxUses` can be exceeded under concurrency. There is **no test** for this (contrast: order and warehouse concurrency both have dedicated tests).
- **MKT-DATA-003 — three competing sources of truth for voucher usage:** `vouchers.used_count`, `COUNT(voucher_redemptions)`, and `COUNT(campaign_analytics WHERE event_type='CONVERSION')`. `getVoucherAnalytics` reports the first two side by side as `usedCount` and `redemptions`. They diverge by construction: `incrementVoucherUsage` writes a `VoucherRedemption` row **only when `userId != null`**, so every guest checkout increments `used_count` without a redemption row. This is precisely the §33 scenario, and it is real.
- **MKT-SEC-001 — customer-bound compensation vouchers are publicly listed.** `GET /api/marketing/vouchers` is `permitAll` and `findAllActive` does not exclude rows with `granted_to_customer_id`. Every CSKH compensation voucher code, name, and value is enumerable by anonymous users. Redemption is correctly blocked by `validateVoucher`, so this is disclosure, not theft — but the codes and the compensation amounts leak.
- **MKT-SEC-003 — `@RequestBody Voucher` / `Campaign` / `Banner` / `ProductPlacement` bind the JPA entity directly** (mass assignment). `updateVoucher` explicitly guards `usedCount`, but `createVoucher` does not guard `id`, `shopId`, or `grantedToCustomerId` — a marketing user can mint a voucher pre-bound to an arbitrary customer, or set `shopId` to another shop.
- `deleteVoucher` / `deleteCampaign` / `deleteBanner` are hard `deleteById` with no check for existing `voucher_redemptions`, orphaning redemption and analytics rows.
- `createVoucher` has no code-uniqueness pre-check; the DB unique constraint catches it and `GlobalExceptionHandler` maps `DataIntegrityViolationException → 409`, so the outcome is acceptable but the message is generic. `updateVoucher` can change a code to a duplicate with the same result.

### 5.5 Analytics (`analytics/page.tsx`) — **entirely fabricated**

**There is not one `fetch` call in this 335-line file.** Lines 39–137 define `const DATA: Record<DateRange, {...}>` — four hand-authored datasets for `today` / `7d` / `30d` / `all`. The date-range selector switches between constants; it issues no request. Everything the page displays is invented:

- Revenue figures: `1,850,000` / `12,400,000` / `45,200,000` / `158,000,000` ₫
- Campaign names: `"Flash Sale 12/12"`, `"Summer Collection"`, `"VIP Loyalty"`, `"Referral Bonus"`
- Voucher codes: `SUMMER2026`, `FREESHIP50`, `FLASH50K`, `VIP20`, `SAVE30K`
- Banner names, positions, impressions, clicks, CTR, conversion rates, and up/down trend arrows

A marketing manager using this page to make a budget decision would be acting on numbers that exist nowhere but this source file. Meanwhile `/api/marketing/admin/analytics/overview`, `/campaigns/{id}`, `/banners/{id}`, `/vouchers/{id}` all exist, are permission-gated, and return real aggregates.

**And the real backend analytics have their own defects:**
- **The `since` date filter is accepted and ignored** in `getCampaignAnalytics`, `getBannerAnalytics`, and `getVoucherAnalytics` — the parameter is declared, bound via `@DateTimeFormat`, passed in, and never referenced in the method body. Any date range returns all-time numbers. Only `getAnalyticsOverview` honours it.
- **`getBannerAnalytics` calls `analyticsRepository.findAll()` three times**, streaming the entire `campaign_analytics` table into JVM memory per request to count three event types. `getVoucherAnalytics` and `computeTopVouchers` each do the same once more. This is an unbounded full-table load on the highest-volume table in the schema.
- **`POST /api/marketing/public/track` is unauthenticated and accepts attacker-controlled `campaignId`, `voucherId`, `orderId`, and `revenue`.** Anyone can inject arbitrary CONVERSION events with arbitrary revenue, permanently poisoning every analytics figure. There is no rate limit on this path (`RateLimitFilter` covers only four `/api/auth/*` URLs).

### 5.6 Banners (`banners/page.tsx`) — real API, silent failures

Wired to the correct `/api/marketing/admin/banners` endpoints, with loading and empty states. But:
- Line 183: `console.error("Save banner failed, but optimistic update kept", error)` — **the save failed and the optimistic row is deliberately left on screen with no error toast.** The user sees their banner; a refresh reveals it was never saved.
- Line 202: toggle-status failure is `console.error`-only, no toast, no revert.
- Only delete (line 226) surfaces an error to the user. Three different error-handling policies in one file.

### 5.7 Product Placement (`product-placement/page.tsx`) — demo-grade

- Line 144–145: `console.warn("Save order API failed, mock success"); toast.success("Đã lưu thứ tự hiển thị (Mock)")` — same false-success pattern as Campaigns.
- Line 153–160: "Mock adding product", inserting `name: searchProduct || "Mock New Product"` into local state.
- Line 356, visible to the user: *"Trong bản demo, nhập bất kỳ tên nào và nhấn Thêm để tạo mock data."* — demo copy shipped in the staff UI.
- Read path uses the non-existent `/api/staff/marketing/placements`; there is no create/update/delete call to the real `/api/marketing/admin/placements` at all.

### 5.8 Posts (`posts/page.tsx`) — a module with no backend

601 lines of list/filter/create/edit/publish UI against `/api/staff/marketing/posts`. There is **no `Post` entity, no `posts` table in `V1__baseline.sql`, no repository, no service, no controller**. The feature is a shell. It is nonetheless listed in the sidebar, the page-local nav, the dashboard quick-links, and the dashboard's "Bài viết đã đăng" tile (hardcoded to 0).

### 5.9 Marketing navigation

- **Breadcrumb sends marketing staff to a forbidden page.** `getRouteMetadata` builds the section crumb as `pathname.startsWith('/admin') ? ... : pathname.startsWith('/store-owner') ? ... : '/staff/dashboard/sales'`. For every marketing route the "Marketing" crumb therefore links to `/staff/dashboard/sales`, which `isRouteAllowedForStaffRole` denies for `MARKETING_STAFF` → access-denied panel. Identical defect for warehouse, shipping, and CSKH crumbs.
- `/staff/banners` and `/staff/vouchers` are built, routable, and registered in `ALL_ROUTES_REGISTRY` as Marketing pages, but absent from the marketing sidebar — orphaned duplicates of `/staff/dashboard/marketing/banners` and `/vouchers`.
- The marketing sidebar and the page-local nav list the same seven links with different active-state colours (`purple` in `page.tsx`, `red` in `analytics/page.tsx`) — the same nav renders in two different brand colours depending on which page you are on.

### 5.10 Marketing responsive / states summary

| Page | Loading | Error | Empty | Real data |
|---|---|---|---|---|
| Dashboard | Yes | **No** | **No** | 3 of 8 KPIs |
| Campaigns | Yes | Partial | Yes | **None** |
| Banners | Yes | **Partial (2 of 3 silent)** | Yes | Yes |
| Posts | Yes | Yes | Yes | **None — no backend** |
| Vouchers | Yes | Yes | Yes | **Yes** |
| Product Placement | Yes | **No (mock success)** | Yes | **None** |
| Analytics | **n/a — no I/O** | **n/a** | **n/a** | **None — 100% fabricated** |

---

## 6. Cross-Module Workflow Findings

**W-1 — Customer order → warehouse → shipping: stock is destroyed, never restored.** `OrderService.checkout` decrements `product_variants.stock` and `available_quantity`. `SalesOrderService.cancelOrder` calls `releaseReservations()` (touches only `inventories.quantity_reserved`) and `restoreSoldCount()` — **it never restores variant stock.** Every cancellation permanently removes sellable inventory from the catalogue. P0.

**W-2 — Reserved stock is never released, and is double-counted.** `WarehouseService.startPicking` adds `item.quantity` to `inventories.quantity_reserved`. No code path anywhere decrements it on PACKED, HANDED_TO_CARRIER, or DELIVERED, and `quantity_on_hand` is never decremented for a sale at all. Additionally, if sales used `requestReservation` → `approveReservation`, that already added the same quantity, so picking double-counts it. Available stock (`on_hand − reserved`) therefore drains monotonically to zero, which then breaks `validateInventoryForConfirmation` (orders become unconfirmable) and `getReplenishmentSuggestions` (everything looks like it needs restocking). P0.

**W-3 — Marketing voucher → checkout → sales → analytics.** Voucher creation skips approval (MKT-BIZ-001); redemption is race-prone (MKT-CONC-001); usage lands in three inconsistent counters (MKT-DATA-003); and the analytics that would surface the discrepancy are fabricated (§5.5). The full loop the brief asks about in §17 is broken at four of its six joints.

**W-4 — `FREE_SHIPPING` vouchers have no effect.** `order.setShippingFee(0.0)` is hardcoded at checkout with the comment `// Hardcode freeship or logic later`; `computeDiscount` returns `discount = 0` for the type. Shipping is free for everyone, so a free-shipping voucher is a no-op that still consumes a redemption slot.

**W-5 — Payment status never advances.** `setPaymentStatus` is called in exactly two places, both in `checkout` (`COD_PENDING` / `WAITING_TRANSFER`). Delivery, COD reconciliation, and bank-transfer confirmation never update it. Every fulfilled order in the database reads as unpaid.

---

## 7. Business Logic Findings

| Invariant | Holds? | Evidence |
|---|---|---|
| Cancelled order returns its stock | **No** | W-1 |
| `reserved ≤ on_hand` | **No** | W-2, monotonic growth |
| `on_hand` decreases when goods ship | **No** | no decrement path exists |
| `used_count == COUNT(redemptions)` | **No** | MKT-DATA-003 |
| `used_count ≤ max_uses` | **No** under concurrency | MKT-CONC-001 |
| Voucher goes live only after approval | **No** | MKT-BIZ-001 |
| COD collected == amount owed | **No** | SHIP-FIN-001 |
| Order status follows the state machine | **Partially** | `ShippingService` and `approveReservation` bypass it |
| Money is exact | **No** | `Order`/`OrderItem` use `Double` |
| Adjustments are approved by a different role | **No** | SEC-RBAC-002 |

**BIZ-001 (P2) — monetary fields are `double`.** `Order.subtotal`, `shippingFee`, `discountTotal`, `totalAmount` and `OrderItem.unitPrice`, `totalPrice` are `Double`/`double precision`. Discounts are computed correctly in `BigDecimal` inside `MarketingService` and then downcast via `.doubleValue()`. `Voucher`, `Shipment`, and `CodReconciliation` correctly use `BigDecimal` — so the system mixes both representations across the same transaction.

**BIZ-002 (P2) — `verifyOrder` can erase customer contact data.** `SalesOrderService.verifyOrder` guards the name (`if (name != null && !name.isBlank())`) but calls `order.setPhone(phone)` and `order.setShippingAddress(address)` unconditionally. A partial update posting only a name nulls the phone and the shipping address of a live order.

**BIZ-003 (P2) — `approveReservation` bypasses the state machine.** It sets `order.setStatus(OrderStatus.CONFIRMED)` directly, with no `stateMachine.validateTransition` call — it can resurrect a `CANCELLED` or `DELIVERED` order into `CONFIRMED`.

**BIZ-004 (P2) — `ShippingService` bypasses the state machine entirely.** `handover()`, `startShipping()`, and `delivered()` set order status directly and write **no `OrderStatusHistory` row**, unlike sales and warehouse. `handover()` validates no precondition at all, so a `DELIVERED` shipment can be pushed back to `HANDED_TO_CARRIER`. The order audit trail is therefore incomplete for the entire shipping leg.

**BIZ-005 (P3) — dead status branch.** `ReviewService` gates on `"DELIVERED".equals(s) || "COMPLETED".equals(s)`; `COMPLETED` is not a member of `OrderStatus`.

---

## 8. Security Findings

**SEC-SEED-001 (P0, Confirmed) — hardcoded admin credentials auto-seeded on every boot.** `DataSeeder` is a bare `@Component implements CommandLineRunner` with **no `@Profile` and no `@ConditionalOnProperty`** (contrast `DatabaseSeederConfig`, which is correctly `@ConditionalOnProperty`-guarded). On every startup, in every environment including production, it creates eight staff accounts — `admin@et.tee` (ADMIN), `owner@et.tee`, `marketing@et.tee`, … — all with the password `Check@123`, `status = ACTIVE`, `emailVerified = true`, and **`mustChangePassword = false`**. Anyone with repository access has production admin credentials. *Reproduction:* `POST /api/auth/login {"email":"admin@et.tee","password":"Check@123"}`.

**SEC-RBAC-005 (P1, Confirmed) — permissions cannot be revoked.** `JwtAuthenticationFilter`:
```java
if (permissions.isEmpty()) { permissionCodes = DEFAULT_PERMISSIONS.getOrDefault(role, List.of()); }
```
An admin who removes permissions one by one via `/api/admin/rbac` restores the **entire hardcoded default set** the moment the last row is deleted. Revocation silently inverts into full restoration.

**SEC-RBAC-001/002/003/004 (P1, Confirmed) — coarse class-level gating conflates read with write.** Each staff controller applies one permission at the class level and none at the method level:

| Controller | Class gate | What it actually authorises |
|---|---|---|
| `StaffSalesController` | `VIEW_NEW_ORDER` | confirm, cancel, verify, reserve — not `VERIFY_ORDER` |
| `StaffWarehouseController` | `INBOUND_STOCK` | adjust stock, **approve adjustments**, approve/reject reservations, handover — not `ADJUST_STOCK` |
| `StaffShippingController` | `MANAGE_WAYBILL` | create shipments, upload POD, **reconcile COD** — not `RECONCILE_COD` |
| `StaffProductController` | `PRODUCT_VIEW` | create, update, **delete** products |

The granular permission catalogue in `PermissionConstants` (58 permissions, fully documented in Vietnamese) is almost entirely decorative for these four controllers.

**SEC-RBAC-002b (P1) — segregation of duties violated.** `POST /api/staff/warehouse/adjustments/{id}/approve` lets the same warehouse account that filed an adjustment approve it, defeating the `SHOP_OWNER` `APPROVE_SHOP_PROMO` control that `StoreOwnerController` implements for the same records.

**SEC-IDOR-002 (P1, Confirmed) — `approveAdjustment` has no shop check.** It resolves via `adjustments.findById(id)` directly, not via the ownership-checking `inventory(id)` helper used elsewhere in the same class. A warehouse user of shop B can approve shop A's stock adjustment by ID.

**SEC-IDOR-003 (P1, Confirmed) — `getStocktakes()` computes the shop filter and discards it.**
```java
Long shopId = resolveShopId();   // assigned, never read
return stocktakes.findAll();
```
Every shop's stocktakes are returned to every warehouse user. `getReplenishmentSuggestions()` has no shop filter at all.

**ORD-IDOR-001 (P1, Confirmed) — order history leaks cross-shop.** `SalesOrderService.getOrderStatusHistory(orderId)` queries the repository directly; every sibling method routes through `getOrder(id)` → `checkOrderOwnership`. `GET /api/staff/sales/orders/{id}/history` therefore returns any order's full status trail, including actor IDs, to any sales user of any shop.

**SEC-AUTH-002 (P1, Confirmed) — `test_role` cookie backdoor in the edge proxy.** `src/proxy.ts`:
```js
const testRole = request.cookies.get('test_role')?.value;
if (testRole) { userRole = testRole.toUpperCase().replace(/^ROLE_/, ''); }
```
Any visitor can run `document.cookie='test_role=ADMIN'` and the proxy routes them as ADMIN. The backend still enforces authorisation, so no data is exposed — but a development shortcut is shipped in the production edge layer, and it takes precedence over the real token.

**SEC-AUTH-003 (P1, Confirmed) — session expiry is unhandled end to end.**
1. `SecurityConfig` configures **no `AuthenticationEntryPoint`**, so an absent or expired token yields **403, never 401**.
2. `api-client.ts` triggers its refresh only on 401 → refresh never fires; `clearAuthSession()` on 401 never fires either.
3. The user instead receives `"Bạn không có quyền thực hiện thao tác này."` — a permissions message for what is actually an expired session.
4. `grep -rn "refresh" backend/src/main/java` returns **nothing**: `POST /api/auth/refresh` does not exist and no refresh token is ever issued. The entire `refreshAccessToken()` mechanism, including the `ettee_refresh_token` localStorage slot, is dead code against a contract the backend never had.
5. The `auth_token` cookie is written with `max-age=2592000` (30 days) while `app.jwt.expiration` is 86 400 000 ms (24 h) — for 29 days the proxy treats the user as logged in while every API call 403s.

**SEC-AUTH-004 (P2) — the JWT is stored in `localStorage` and in a non-`HttpOnly`, non-`Secure` cookie** set via `document.cookie`, making it readable by any XSS payload.

**SEC-MKT-004 (P2) — unauthenticated analytics injection**, see §5.5 (`/api/marketing/public/track`).

**SEC-RATE-001 (P2) — rate limiting is narrow and proxy-blind.** `RateLimitFilter` covers only `/api/auth/login|register|forgot-password|check-email`, keys on `request.getRemoteAddr()` (behind any reverse proxy all users collapse to one bucket, or the real client IP is invisible), and stores buckets in an unbounded `ConcurrentHashMap` keyed by IP — a memory-growth vector. Checkout, voucher validation, and event tracking are unthrottled.

**SEC-CONFIG-001 (P2) — CSRF is disabled globally** while the session token is carried in a cookie the proxy reads. Authorization uses the `Authorization` header so API calls are not forgeable, but the combination is fragile.

*Checked and found sound:* `.env` is git-ignored and untracked (`git ls-files` confirms; no history). BCrypt strength 12. Order codes are UUID-derived, not sequential. Guest order access is capability-token gated. Shipping shop isolation is enforced on all ten shipment methods.

---

## 9. Database & Data Integrity Findings

**DB-001 (P1, Likely) — Flyway may skip the only migration it has.** `spring.flyway.baseline-version=1` and the sole migration is `V1__baseline.sql` (version `1`). Flyway skips migrations whose version is **≤** the baseline version. On a truly empty schema Flyway runs normally and V1 applies; but on any schema that is non-empty yet lacks `flyway_schema_history` (a partially-provisioned DB, a restored dump, a half-failed first run), `baseline-on-migrate=true` writes a baseline row at version 1 and **V1 is never executed**. With `spring.jpa.hibernate.ddl-auto=validate`, the application then fails to start with no tables. Setting `baseline-version` to `0` would remove the hazard.

**DB-002 (P1, Confirmed) — the documented migration safeguard is not configured.** `application.properties` warns, at length, that Flyway needs a session-level advisory lock and must not run through Supabase's transaction pooler, and instructs that `DB_MIGRATION_URL` be set to the direct port-5432 connection. **`.env` does not define `DB_MIGRATION_URL`.** `spring.flyway.url` therefore falls back to `DB_URL`, which is `aws-0-ap-south-1.pooler.supabase.com:6543` — the transaction pooler the comment forbids.

**DB-003 (Cannot verify) — which schema is authoritative is unknowable from the repository.** The comment states the live DB carries `flyway_schema_history` with a `BASELINE` row at `20260908000000`, so `V1__baseline.sql` is skipped there and the real schema is whatever the 21 retired files in `db/legacy-migration/` produced. Nothing in CI or the test suite compares `V1__baseline.sql` against the live schema, and `ddl-auto=validate` only runs at production boot. **Verifying this requires connecting to the live Supabase database, which I did not do.**

**DB-004 (P2) — `inventories` has no `(shop_id, product_id)` uniqueness**, see A-2.

**DB-005 (P2) — hard deletes orphan dependent rows.** `deleteVoucher` leaves `voucher_redemptions` and `campaign_analytics` rows pointing at a missing voucher; `deleteCampaign` and `deleteBanner` likewise. `getAnalyticsOverview` already tolerates this (`banner != null ? ... : null`, `findById(cid).ifPresent`) — which means top-banner and top-campaign lists **silently drop** deleted entities' traffic, understating totals rather than erroring.

**DB-006 (P3) — four tables in `V1__baseline.sql` have no entity and no code reference:** `product_recommendation_tags`, `product_style_tags`, `user_behavior_events`, and the AI-recommendation scaffolding. Dead schema.

**DB-007 (P3) — `CodReconciliation.reconciliationCode` uses `new Random().nextInt(10000)`** against a `UNIQUE` constraint; a same-day collision surfaces as a 409 rather than a retry.

---

## 10. API Contract Findings

| # | Frontend expects | Backend provides | Severity |
|---|---|---|---|
| API-001 | `GET/POST/PUT/DELETE /api/staff/marketing/campaigns` | nothing | P0 |
| API-002 | `/api/staff/marketing/posts` | nothing; no entity | P1 |
| API-003 | `/api/staff/marketing/placements?section=` | `GET /api/marketing/admin/placements` | P1 |
| API-004 | `PUT .../campaigns/{id}/status` | `PATCH /api/marketing/admin/campaigns/{id}/status` | P1 |
| API-005 | `POST /api/auth/refresh` + refresh token | no refresh support at all | P1 |
| API-006 | Campaign `{type, targetAudience}` | Campaign `{code, goal, budget, isActive}` | P1 |
| API-007 | Campaign `id: string` | `Long` | P3 |
| API-008 | 401 on expired session | 403 (no `AuthenticationEntryPoint`) | P1 |
| API-009 | `?since=` filters campaign/banner/voucher analytics | parameter accepted and ignored | P1 |

**API-010 (P2) — inconsistent response envelopes.** `MarketingController` hand-builds `Map<String,Object>{success,data,message}` in all 27 handlers while `ApiResponse<T>` and `PaginatedResponseDto<T>` exist and are used elsewhere. Frontend call sites defend with `Array.isArray(data) ? data : (data?.data ?? data?.content ?? [])` — three guesses at the shape in one expression.

---

## 11. UI/UX Findings

### 11.1 Global UI/UX

- **G-1 (P2)** — orphaned pages absent from all navigation: `/admin/backup`, `/admin/monitoring`, `/admin/categories`, `/admin/settings/payments-shipping`, `/admin/style-guide`, `/store-owner/promotions`, `/store-owner/inventory`, `/staff/banners`, `/staff/vouchers`. Nine built, routable, unreachable pages.
- **G-2 (P2)** — the breadcrumb defect in `getRouteMetadata` (§5.9) affects marketing, warehouse, shipping, and CSKH equally: every section crumb outside `/admin` and `/store-owner` links to `/staff/dashboard/sales`.
- **G-3 (P2)** — the route guard is client-side only and renders after mount (`useEffect` + `mounted`), so unauthorised content can flash before the denial panel replaces it. Acceptable because the backend enforces, but the UX is a visible flicker on every staff page load.
- **G-4 (P3)** — a `/admin/style-guide` page exists (a design system was intended) but the marketing module ignores it, as does `src/components/staff/marketing/` (A-5).

### 11.2 Marketing Staff UI/UX

Consolidated from §5. In the brief's requested format:

| # | Page | Component | Current behaviour | Problem | UX consequence | Sev | Direction |
|---|---|---|---|---|---|---|---|
| MKT-UI-001 | Analytics | whole page | Four range tabs switch between four hardcoded datasets | No I/O of any kind | Staff make budget decisions on invented revenue | **P0** | Bind to the four existing analytics endpoints; delete `DATA` |
| MKT-UI-002 | Dashboard | KPI row | 5 of 8 tiles hardcoded `0` | Data never fetched | Dashboard looks "quiet"; the real overview endpoint is ignored | **P0** | Call `/analytics/overview` |
| MKT-UI-003 | Campaigns | create form | `toast.success(... "(Mock)")` in the `catch` | Success reported on failure | User believes a campaign is live; it is not | **P0** | Remove the mock branch; surface the error |
| MKT-UI-004 | Dashboard | primary CTA | `"rounded-xl    hover: hover: px-5 ... text-white"` | Invalid class, no background utility | White text on white — the main CTA is invisible | **P1** | Restore the background token |
| MKT-UI-005 | Dashboard | quick-link tiles, campaign rows | `accent: " "` interpolated as the only background | Icon tiles render transparent | `text-white` icons invisible on a light card | **P1** | Same |
| MKT-UI-006 | Banners | save / toggle | Failure logged to console, optimistic row kept | Silent failure | Change appears saved, vanishes on refresh | **P1** | Revert on error + toast |
| MKT-UI-007 | Placement | save order / add | `toast.success("… (Mock)")`, "Trong bản demo…" copy | Demo scaffolding in staff UI | Reordering never persists | **P1** | Wire to `/marketing/admin/placements` |
| MKT-UI-008 | Dashboard | active-campaign panel | No empty and no error state | `[]` renders a bare box | Broken endpoint is indistinguishable from "no campaigns" | **P1** | Add both states |
| MKT-UI-009 | Dashboard | Play/Pause icons | Decorative `lucide` icons, no handler | False affordance | Staff click expecting to pause a campaign | **P2** | Make them buttons or drop them |
| MKT-UI-010 | all | nav | Sidebar + page-local pill bar + breadcrumbs, purple on one page, red on another | Three nav systems, two palettes | Position in the app is ambiguous | **P2** | Keep the sidebar; delete the local navs |
| MKT-UI-011 | Dashboard | "Chiến dịch đang hoạt động" | Renders all campaigns from `?size=5` | Title contradicts content | Mislabelled panel | **P2** | Filter by status or retitle |
| MKT-UI-012 | Posts | whole page | Full UI, no backend | Feature shell in the sidebar | Every action errors | **P1** | Hide the route or build the backend |
| MKT-UI-013 | all | `MarketingShell` etc. | 536 lines, zero importers | Design system bypassed | Six pages, six table/badge/modal implementations | **P2** | Adopt or delete |

---

## 12. Testing Findings

**Executed this audit (real runs, not inspection):**
- `./mvnw test` → **96 tests, 0 failures, 0 errors, 0 skipped**, 16 test classes. Fresh run at 12:30:17–12:30:40.
- `npm run build` → **exit 0**, 95 routes compiled, proxy middleware bundled.

**TEST-001 (P1, Confirmed) — the whole suite is false confidence about the production schema.** `src/test/resources/application-test.yml` sets `flyway.enabled: false` and `ddl-auto: create-drop` on an in-memory **H2** database. Consequences:
1. **`V1__baseline.sql` is never executed by any test.** Nothing verifies it matches the entities, which is exactly what production's `ddl-auto=validate` demands at boot. DB-001 and DB-003 are unverifiable precisely because of this.
2. `SalesOrderConcurrencyIntegrationTest` and `WarehouseConcurrencyIntegrationTest` exercise `SELECT … FOR UPDATE` semantics on H2, not PostgreSQL. They cannot prove the checkout oversell guard.
3. Postgres CHECK constraints, partial indexes, and `character varying` behaviour are absent.

**TEST-002 (P1, Confirmed) — the highest-risk module has zero tests.** No test class touches `MarketingService`, `MarketingController`, voucher validation, `computeDiscount`, or `incrementVoucherUsage`. Every P0/P1 marketing finding in this report sits in untested code. By contrast COD reconciliation (11 tests) and support tickets (7 tests) — the two soundest modules — are the best covered. Test coverage and defect density are inversely correlated across this repository.

**TEST-003 (P2) — `OrderServiceTest` (9 tests, passing) does not cover cancellation.** W-1, the P0 stock-restoration bug, lives in code the order tests nominally cover.

**TEST-004 (P3) — a stale artefact.** `target/surefire-reports/com.nguyenhoanglong.SchemaValidationManualTest.txt` (12:21) has no corresponding source file. `target/` is not cleaned between runs, so reading surefire reports without checking timestamps would attribute a passing schema-validation test to the current codebase. It is not one.

**Missing coverage, ranked:** voucher concurrency; voucher/campaign status transitions; cancellation → stock restoration; reservation release; `Inventory` vs `ProductVariant` reconciliation; RBAC negative tests (does `PRODUCT_VIEW` really allow delete? — it does); marketing cross-shop isolation; Flyway-against-Postgres schema validation.

---

## 13. Complete Issue Register

| ID | Sev | Category | Module | Issue | Evidence | Root cause | Impact | Repro | Status |
|---|---|---|---|---|---|---|---|---|---|
| MKT-DATA-001 | P0 | Frontend/Data | Marketing | Analytics page is 100% fabricated | `analytics/page.tsx:39-137`, zero `fetch` | Page never wired | Decisions on invented revenue | Open the page offline; numbers still render | Confirmed |
| MKT-DATA-002 | P0 | Frontend/Data | Marketing | 5 dashboard KPIs hardcoded `0` | `marketing/page.tsx:118-127` | Overview endpoint never called | Dashboard is decorative | Inspect `setStats` | Confirmed |
| MKT-LOGIC-001 | P0 | Logic | Marketing | Campaign create fakes success | `campaigns/page.tsx:111-119` | Mock fallback in `catch` | Campaigns silently never created | Create a campaign, refresh | Confirmed |
| MKT-API-001 | P0 | API | Marketing | `/api/staff/marketing/**` does not exist | `grep` over `src/main/java` = 0 hits; 9 call sites | Namespace never built | Campaigns/Posts/Placement inert | Any call → 403/404 | Confirmed |
| ORD-INV-001 | P0 | Data Integrity | Order | Cancel never restores variant stock | `SalesOrderService.cancelOrder` vs `OrderService.checkout` | Two stock models | Inventory destroyed per cancellation | Order → cancel → check `product_variants.stock` | Confirmed |
| ORD-INV-002 | P0 | Data Integrity | Warehouse | `quantity_reserved` never released | `WarehouseService.startPicking`; no decrement anywhere | Missing release step | Available stock drains to 0 | Pick an order; inspect `inventories` | Confirmed |
| ORD-INV-003 | P0 | Logic | Warehouse | Reservation double-counted | `approveReservation` + `startPicking` both add | Two reserve paths | Reserved inflated ~2× | Reserve then pick | Confirmed |
| SEC-SEED-001 | P0 | Security | Config | `Check@123` admin auto-seeded in prod | `DataSeeder.java:18-50,159-173`, no `@Profile` | Unguarded `CommandLineRunner` | Full admin takeover | Login `admin@et.tee`/`Check@123` | Confirmed |
| MKT-BIZ-001 | P1 | Business Rule | Marketing | Vouchers bypass shop-owner approval | `createVoucher` status=ACTIVE, shopId=null vs `findPendingApprovalByShopId` | Two independent gaps | Approval control is dead | Create voucher; check queue | Confirmed |
| MKT-CONC-001 | P1 | Concurrency | Marketing | Voucher usage lost-update | `incrementVoucherUsage` read-modify-write | No lock/version | `maxUses` exceeded | Concurrent redemptions | Confirmed |
| MKT-DATA-003 | P1 | Data Integrity | Marketing | 3 divergent usage counters | `used_count` vs redemptions vs analytics | Guest redemptions skip the row | Analytics unreliable | Guest checkout with voucher | Confirmed |
| MKT-API-002 | P1 | API | Marketing | `since` filter ignored | `getCampaign/Banner/VoucherAnalytics` | Param unused | Date ranges are lies | Pass any `since` | Confirmed |
| MKT-PERF-001 | P1 | Performance | Marketing | `findAll()` on `campaign_analytics` ×5 | `getBannerAnalytics` (×3), `getVoucherAnalytics`, `computeTopVouchers` | In-memory aggregation | OOM at volume | Load test | Confirmed |
| MKT-SEC-001 | P1 | Security | Marketing | Bound compensation vouchers public | `permitAll` + `findAllActive` | No `granted_to_customer_id` filter | Code/value disclosure | `GET /api/marketing/vouchers` | Confirmed |
| MKT-SEC-003 | P1 | Security | Marketing | Entities bound as request bodies | 4 `@RequestBody` entity params | No DTO layer | Mass assignment | POST with extra fields | Confirmed |
| MKT-BIZ-003 | P1 | Business Rule | Marketing | No status transition rules | `updateVoucher/CampaignStatus` accept any string | No state machine | `EXPIRED→ACTIVE` allowed | PATCH status `"X"` | Confirmed |
| MKT-BIZ-002 | P1 | Business Rule | Marketing | No voucher value validation | `createVoucher` 3 null checks only | Validation gap | `PERCENT=500`, negatives | POST such a voucher | Confirmed |
| SEC-RBAC-005 | P1 | Security | RBAC | Revoking the last permission restores defaults | `JwtAuthenticationFilter` `if (permissions.isEmpty())` | Fallback misapplied | Cannot revoke | Delete all rows for a role | Confirmed |
| SEC-RBAC-001..004 | P1 | Security | Staff | Class-level gate conflates read/write | 4 controllers, table §8 | Coarse gating | Privilege escalation within role | Call write with view perm | Confirmed |
| SEC-RBAC-002b | P1 | Business Rule | Warehouse | Self-approval of adjustments | `StaffWarehouseController:58` | No SoD | Stock fraud | Create then approve | Confirmed |
| SEC-IDOR-002 | P1 | Security | Warehouse | `approveAdjustment` no shop check | `WarehouseService.approveAdjustment` | Bypasses `inventory()` helper | Cross-shop write | Approve another shop's ID | Confirmed |
| SEC-IDOR-003 | P1 | Security | Warehouse | `getStocktakes` discards shop filter | assigned, never read | Dead variable | Cross-shop read | `GET /stocktakes` | Confirmed |
| ORD-IDOR-001 | P1 | Security | Sales | Order history has no ownership check | `getOrderStatusHistory` | Skips `getOrder()` | Cross-shop read | `GET /orders/{id}/history` | Confirmed |
| SEC-AUTH-002 | P1 | Security | Frontend | `test_role` cookie backdoor | `proxy.ts` | Dev shortcut shipped | Frontend role gate bypass | Set the cookie | Confirmed |
| SEC-AUTH-003 | P1 | Security | Auth | Session expiry unhandled (5-link chain) | §8 | No entry point + no refresh endpoint | Users stuck on a false 403 | Expire a token | Confirmed |
| SHIP-FIN-001 | P1 | Business Rule | Shipping | `codAmount` client-supplied, unvalidated | `createShipment` | No cross-check vs order | COD under/over-collection | Create shipment with `codAmount=0` | Confirmed |
| ORD-PAY-001 | P1 | Business Rule | Order | `paymentStatus` never advances | 2 writes, both in checkout | Missing transitions | All orders read unpaid | Deliver an order | Confirmed |
| MKT-UI-004/005 | P1 | UI/UX | Marketing | Invisible CTA + icon tiles | broken class strings | Invalid Tailwind | Primary action unusable | Render the dashboard | Confirmed |
| MKT-UI-006 | P1 | Error Handling | Marketing | Banner save fails silently, row kept | `banners/page.tsx:183` | Deliberate optimistic keep | Phantom saves | Save with backend down | Confirmed |
| MKT-UI-007 | P1 | Logic | Marketing | Placement save/add are mocks | `product-placement/page.tsx:144,153,356` | Demo scaffolding | Reordering never persists | Reorder, refresh | Confirmed |
| MKT-UI-012 | P1 | Frontend | Marketing | Posts module has no backend | no entity/table/controller | Feature never built | Every action errors | Open Posts | Confirmed |
| DB-001 | P1 | Configuration | DB | Flyway may skip `V1__baseline` | `baseline-version=1`, only `V1` | Version ≤ baseline | Boot failure on non-empty schema | Provision a partial DB | Likely |
| DB-002 | P1 | Configuration | DB | `DB_MIGRATION_URL` unset | `.env` vs the properties comment | Config omission | Migrations over the txn pooler | Run a migration | Confirmed |
| TEST-001 | P1 | Testing | All | Suite runs H2 + `create-drop`, Flyway off | `application-test.yml` | Schema never tested | False confidence | Read the config | Confirmed |
| TEST-002 | P1 | Testing | Marketing | Zero marketing tests | `src/test` listing | Coverage gap | All P0s untested | — | Confirmed |
| BIZ-001 | P2 | Data Integrity | Order | Money as `double` | `Order`, `OrderItem` | Type choice | Rounding drift | Fractional discounts | Confirmed |
| BIZ-002 | P2 | Logic | Sales | `verifyOrder` nulls phone/address | no null guard | Partial-update bug | Contact data loss | PUT name only | Confirmed |
| BIZ-003 | P2 | Logic | Warehouse | `approveReservation` bypasses FSM | direct `setStatus` | Missing validation | Cancelled order resurrected | Approve on a cancelled order | Confirmed |
| BIZ-004 | P2 | Logic/Audit | Shipping | Shipping bypasses FSM + no history | `handover/startShipping/delivered` | Inconsistent pattern | Audit gap; re-handover | Handover a delivered shipment | Confirmed |
| SEC-MKT-004 | P2 | Security | Marketing | Unauthenticated analytics injection | `/public/track` | Public + unthrottled | Analytics poisoning | POST fake revenue | Confirmed |
| SEC-RATE-001 | P2 | Security | Auth | Rate limit narrow + `getRemoteAddr` | `RateLimitFilter` | No proxy awareness | Bypass or mass lockout | Behind a proxy | Confirmed |
| SEC-AUTH-004 | P2 | Security | Frontend | Token in localStorage + JS cookie | `auth.ts:97` | Storage choice | XSS exfiltration | — | Confirmed |
| SEC-AUTH-005 | P2 | Security | Frontend | Cookie 30 d vs token 24 h | `auth.ts:97` vs properties | Mismatch | 29 d of false "logged in" | Wait 24 h | Confirmed |
| MKT-DB-001 | P2 | Data Integrity | Marketing | Hard deletes orphan children | `deleteVoucher/Campaign/Banner` | No guard | Analytics silently understate | Delete a used voucher | Confirmed |
| A-2 | P2 | Architecture | Warehouse | `inventories` not keyed by shop | `findByProductIdWithLock` | Schema design | Multi-shop stock impossible | — | Confirmed |
| SHIP-PERF-001 | P2 | Performance | Shipping | `getPendingCod` N+1 over `findAll()` | `existsByShipmentId` per row | In-memory filter | Degrades with volume | Load test | Confirmed |
| MKT-UI-008..011,013 | P2 | UI/UX | Marketing | States, nav duplication, false affordances, dead design system | §11.2 | — | — | — | Confirmed |
| G-1 | P2 | UI/UX | Global | 9 orphaned pages | `role-navigation.config.ts` vs routes | Nav not maintained | Unreachable features | Compare lists | Confirmed |
| G-2 | P2 | UI/UX | Global | Section breadcrumb → forbidden page | `getRouteMetadata` fallback | Hardcoded sales href | Access-denied on a breadcrumb | Click "Marketing" | Confirmed |
| API-010 | P2 | API | Marketing | Ad-hoc response envelopes | 27 hand-built maps | `ApiResponse` unused | Triple-guess parsing | — | Confirmed |
| G-3 | P3 | UI/UX | Global | Guard renders after mount | `(staff)/layout.tsx` | Client-only guard | Content flash | Hard refresh | Confirmed |
| BIZ-005 | P3 | Logic | Review | `COMPLETED` not in `OrderStatus` | `ReviewService:117,194` | Dead branch | None today | — | Confirmed |
| DB-006 | P3 | Database | Schema | 4 unused tables | `V1__baseline.sql` | AI scaffolding | Confusion | — | Confirmed |
| DB-007 | P3 | Database | Shipping | `Random().nextInt(10000)` vs UNIQUE | `createCodReconciliation` | Weak generator | Occasional 409 | High same-day volume | Confirmed |
| MKT-PERF-002 | P3 | Performance | Warehouse | `findAll()` + JVM filter | `getInventory`, `getAdjustments` | In-memory filtering | Scales poorly | — | Confirmed |
| AUTH-003 | P3 | Security | Cart | `/api/cart/**` fully public, unthrottled | `SecurityConfig` | By design | Guest-cart spam | — | Suspected |
| JWT-001 | P3 | Error Handling | Auth | `JwtAuthenticationFilter` swallows all exceptions | empty `catch (Exception e)` | No logging | Undiagnosable auth failures | Send a malformed token | Confirmed |
| DB-003 | — | Database | Schema | Authoritative schema unknown | §9 | Legacy baseline | Unquantified drift | Requires live DB | **Cannot verify** |

**Cannot verify** (require a running stack / live DB, out of scope for a read-only audit): DB-003 schema drift; actual row-level data integrity (orphans, duplicates, stale statuses); real browser rendering and responsive behaviour at the four breakpoints (§24); keyboard/contrast accessibility (§25); production runtime performance. Sections 24 and 25 of the brief are therefore **not tested** — I have not asserted findings I could not evidence.

---

## 14. Root Cause Grouping

**Root Cause A — Marketing was built frontend-first and never joined to the backend.**
Affects: MKT-DATA-001/002, MKT-LOGIC-001, MKT-API-001/002, MKT-UI-007, MKT-UI-012, API-001..004, API-006. *One decision — shipping UI against an imagined `/api/staff/marketing/**` contract — produces ten findings.* Fixing the namespace and deleting the mock fallbacks resolves most of §5 at once.

**Root Cause B — two inventory models, never reconciled.**
Affects: ORD-INV-001/002/003, A-1, A-2, BIZ-003, and the unconfirmable-order symptom. A single owner for stock state (variants or `inventories`, not both) collapses all of these.

**Root Cause C — authorization declared at class level, enforced nowhere finer.**
Affects: SEC-RBAC-001/002/003/004, SEC-RBAC-002b. The 58-permission catalogue exists; four controllers ignore it.

**Root Cause D — shop scoping applied ad hoc, per method, by hand.**
Affects: SEC-IDOR-002/003, ORD-IDOR-001, MKT-SEC-002, A-3. Every ownership check is hand-written and four of them were simply forgotten. A `@ShopScoped` aspect or a repository-level filter would make omission impossible rather than likely.

**Root Cause E — failures are caught and reported as success.**
Affects: MKT-LOGIC-001, MKT-UI-006, MKT-UI-007, MKT-UI-008, JWT-001, and the `try { ... } catch (Exception ignore) {}` around conversion tracking in `OrderService`. Six places where an error becomes a green toast or silence.

**Root Cause F — tests run against a database that is not the production database.**
Affects: TEST-001, DB-001, DB-003. The suite cannot fail on schema drift, so schema drift is unmeasured.

---

## 15. Fix Priority

### P0 — Must fix immediately
1. **SEC-SEED-001** — profile-guard `DataSeeder`, rotate `admin@et.tee`, audit whether the seeded accounts exist on the live DB. *Reason: publicly-known credentials for a production admin account. Everything else in this report is reachable from here.*
2. **ORD-INV-001/002/003** — decide the single source of stock truth; restore stock on cancel; release reservations on fulfilment. *Reason: silent, cumulative, irreversible destruction of sellable inventory in normal operation.*
3. **MKT-DATA-001/002 + MKT-LOGIC-001** — remove the fabricated analytics dataset and the mock-success branches; wire to the existing endpoints or take the pages out of the nav. *Reason: the system currently reports invented business figures and confirms writes that did not happen. This is worse than a missing feature — it is a feature that lies.*
4. **MKT-API-001** — build `/api/staff/marketing/**` or repoint the frontend at `/api/marketing/admin/**`.

### P1 — Must fix before release
SEC-RBAC-005, SEC-RBAC-001..004 and 002b, SEC-IDOR-002/003, ORD-IDOR-001, SEC-AUTH-002/003, MKT-BIZ-001/002/003, MKT-CONC-001, MKT-DATA-003, MKT-SEC-001/003, MKT-API-002, MKT-PERF-001, SHIP-FIN-001, ORD-PAY-001, MKT-UI-004..008/012, DB-001/002, TEST-001/002.
*Reason: each either exposes data across a security boundary, corrupts financial or inventory state, or presents a broken surface to a user who cannot tell it is broken.*

### P2 — Should fix
BIZ-001..004, SEC-MKT-004, SEC-RATE-001, SEC-AUTH-004/005, MKT-DB-001, A-2, SHIP-PERF-001, MKT-UI-009..011/013, G-1/G-2, API-010, TEST-003.

### P3 — Improvement
G-3, BIZ-005, DB-006/007, MKT-PERF-002, AUTH-003, JWT-001, TEST-004.

---

## 16. Regression Risk

| Fix | Also touches | Required regression tests |
|---|---|---|
| Unify the inventory model | checkout, sales confirm, warehouse picking/packing/adjustment, replenishment, store-owner dashboard, product availability on the storefront | Full order lifecycle incl. cancel-at-every-status; concurrent checkout **on PostgreSQL**; reservation approve→pick→deliver |
| Voucher approval + status FSM | marketing UI, store-owner approvals, customer checkout, public voucher list, CSKH compensation grants | Approval round-trip; redemption of an unapproved voucher must fail; CSKH path must not regress |
| Atomic `used_count` | checkout, analytics, store-owner reporting | Concurrency test at `maxUses` boundary; guest vs logged-in redemption parity |
| Tighten class→method permissions | all four staff controllers, every staff UI page | Negative RBAC tests per role per endpoint; confirm no staff page loses a call it legitimately makes |
| Add `AuthenticationEntryPoint` (401) | every frontend call site, `api-client`, the proxy, the staff layout | Expired-token flow end to end; verify 403 still means 403 |
| Repoint marketing endpoints | 7 pages, dashboard tiles, analytics | Contract tests per endpoint; shape assertions on the response envelope |
| Restore stock on cancel | `sold_count`, reservations, analytics conversions, replenishment | Cancel from each cancellable status; assert variant stock, `sold_count`, and reserved all return to baseline |

---

## 17. Final Acceptance Matrix

| Area | Verified | Partially Verified | Failed | Not Tested |
|---|---|---|---|---|
| Authentication | Login, register, reset, BCrypt, rate limit | JWT filter | Session expiry / refresh (SEC-AUTH-003) | Live browser session |
| RBAC | Permission catalogue, `@PreAuthorize` presence | Method-level granularity | Class-level gating, revocation (SEC-RBAC-001..005) | Runtime negative tests |
| Shop Isolation | Shipping (10/10 methods), CSKH, store-owner | Sales, warehouse | 4 methods (SEC-IDOR-002/003, ORD-IDOR-001), all of Marketing | Live cross-shop probe |
| Customer | Catalog, cart, checkout, reviews, wishlist | Order tracking | — | Browser E2E |
| Sales | Order list, confirm, notes, SLA | Verify (BIZ-002) | History IDOR | — |
| Warehouse | Inbound, stocktake CRUD | Adjustments | Reservation/stock lifecycle (ORD-INV-002/003), isolation | — |
| Shipping | Shipment CRUD, COD reconciliation, isolation | Exceptions, POD | COD amount validation, FSM/audit | — |
| CSKH | Tickets, quota, compensation vouchers, binding | — | — | Browser E2E |
| **Marketing** | **Vouchers page only** | Banners | **Dashboard, Campaigns, Posts, Placement, Analytics** | Browser E2E |
| Admin | Users, RBAC, logs, mailing, settings | Backup, monitoring | — | Browser E2E |
| Database | 55 tables vs 51 entities aligned | Constraints, indexes | Flyway baseline config (DB-001/002) | **Live schema drift (DB-003)** |
| API | 49 controllers mapped | Response envelopes | 9 contract mismatches (§10) | Live HTTP probe |
| UI/UX | Build, routing, role nav, 95 routes | States per page | Marketing (13 findings), global nav (G-1/G-2) | **Responsive, a11y (§24/§25)** |
| E2E | — | — | — | **Entire category — no stack was run** |

---

## 18. Verification Log

Everything asserted as **Confirmed** above rests on one of these:

| Method | Evidence |
|---|---|
| Source inspection | Every file and line number cited is quoted from the working tree at `2aa713b` |
| Exhaustive absence proof | `grep -rn "staff/marketing" src/main/java` → 0; `grep -rn "refresh" src/main/java` → 0; `grep -rln "MarketingShell" src/` → 1 (its own definition) |
| **Real test execution** | `./mvnw test` → 96/96 pass; surefire timestamps verified fresh (12:30), one stale artefact identified |
| **Real build execution** | `npm run build` → exit 0, 95 routes |
| Schema comparison | `V1__baseline.sql` `CREATE TABLE` list diffed against all `@Table(name=…)` annotations |
| Config inspection | `application.properties`, `application-test.yml`, `.env` (secrets redacted), `.gitignore`, `git ls-files` |

**Not performed, and therefore not claimed:** no connection was made to the live Supabase database; no backend or frontend server was started; no browser session, screenshot, or HTTP probe was executed. Items depending on those are marked **Cannot verify** or **Not Tested** rather than inferred.

---

*End of report. Phase 1 complete — no fixes were implemented, as instructed.*
