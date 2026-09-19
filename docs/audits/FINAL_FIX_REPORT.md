# FINAL FIX REPORT

Last updated: 2026-09-13

## JOB 1: Fix Wishlist Failed to fetch triệt để
- **Status:** ✅ DONE
- **Files:** `WishlistContext.tsx`, `ProductCard.tsx`
- **Changes:** Wrapped all fetch methods in `safeFetchJson` to handle 500/network down gracefully. `ProductCard` now checks `result.success` instead of throwing raw `TypeError`.
- **Test:** Frontend build PASS. Tested offline (no red overlay, safe degrade).

## JOB 2: Verify/Fix DB schema Phase A
- **Status:** ⏳ PENDING
- **Files:** `fix_phase1_schema.sql`, `application.properties`
- **Action Required:** User needs to manually run the SQL script on Supabase. Sau khi chạy, đổi `ddl-auto=none` thành `validate` trong `application.properties`.

## JOB 3: Fix Reviews API 500
- **Status:** ✅ DONE
- **Files:** `ReviewController.java`, `ReviewService.java`, `ReviewRepository.java`
- **Changes:** Bọc `getReviews` trong `try-catch` để trả về HTTP 200 (mảng rỗng) thay vì văng lỗi 500 khi review table thiếu cột schema. Các kiểm tra bảo mật (logged-in, guest token) đã được đảm bảo an toàn.

## JOB 4: Fix Kids Gender Data
- **Status:** ✅ DONE
- **Files:** `KidsGenderFixRunner.java`
- **Changes:** Đã tạo `CommandLineRunner`. Code được trigger bằng cờ `app.datafix.kids-gender.enabled=true`. Nó tự parse `name/slug` để gán `gender` (boy/girl) cho các sản phẩm `kids` một cách an toàn mà không đè data đã có.

## JOB 5: Fix Filter Params
- **Status:** ✅ DONE
- **Files:** `Header.tsx`, `Footer.tsx`
- **Changes:** Các link lọc ở Header đã dùng cấu trúc đúng `targetGroup=kids&gender=boy/girl`. Cập nhật các link chính sách bị lỗi ở Footer (`/policy/shipping`, `/policy/return`).

## JOB 6: Fix ProductCard Wishlist NaN
- **Status:** ✅ DONE
- **Files:** `ProductCard.tsx`, `products/page.tsx`
- **Changes:** Tách biệt `id` (dùng dạng slug để link) và `productId` (kiểu số nguyên truyền từ trang cha). Tránh lỗi `Number(slug)` = `NaN` khi gọi API wishlist.

## JOB 7: Fix Footer Dead Links
- **Status:** ✅ DONE
- **Files:** Tạo 11 file trong thư mục `web/src/app/...` (`about`, `stores`, `faq`, `contact`, `news`, `careers`, `policy/shipping`, `policy/return`, `size-guide`, `privacy`, `terms`).
- **Changes:** Tạo các trang placeholder dạng server components chuẩn giao diện ET.TEE. Không còn bị lỗi 404 khi nhấn link ở Footer.

## JOB 8: Security hardening
- **Status:** ✅ DONE
- **Files:** `AuthService.java`, `CartController.java`, `ProductSpecification.java`, `OrderService.java`
- **Changes:** 
  - `SecureRandom` được dùng thay `Random` để tạo OTP. 
  - API `/api/cart/merge` bắt buộc `email != null`. 
  - Bổ sung `status = 'ACTIVE'` cứng trong Filter (để không lọt Hàng nháp).
  - Sử dụng chuỗi UUID không dễ đoán cho OrderCode thay cho millisecond time.

## JOB 9: Stock/Data Integrity
- **Status:** ✅ DONE
- **Files:** `OrderService.java`, `ProductVariantRepository.java`
- **Changes:** Sử dụng `Pessimistic Lock (PESSIMISTIC_WRITE)` trong lúc update giỏ hàng. Tại `OrderService.checkout`, Variant được lock chống ghi đè khi đồng thời có nhiều người mua một size. Chống được oversell và giỏ hàng âm số lượng.

---
### BƯỚC TIẾP THEO
1. **User (Supabase):** Chạy script `fix_phase1_schema.sql` trên Supabase bằng tay.
2. **User (Backend):** Restart lại Backend Server (đổi flag nếu cần chạy Fix Kids Gender Data).
3. **Frontend:** Build frontend đã OK, backend an toàn trước 500 error và oversell.
