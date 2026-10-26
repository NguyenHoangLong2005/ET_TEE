# ET.TEE — ứng dụng Flutter

Ứng dụng di động cho **khách hàng** và **nhân viên Marketing**, dùng chung backend Spring Boot
với bản web (`web/`). Logic, đường dẫn và giao diện được chuyển 1-1 từ các trang Next.js.

## Chạy

Cần backend (cổng 8081) và web Next.js (cổng 3000) đang chạy: web vừa proxy `/api/*`, vừa phục vụ ảnh
sản phẩm trong `web/public/images`.

```bash
cd mobile
flutter pub get
flutter run                      # Android emulator: tự dùng http://10.0.2.2:3000
```

Điện thoại thật trong cùng mạng LAN:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000 --dart-define=ASSET_BASE_URL=http://192.168.1.10:3000
```

Bản web (để xem nhanh trên trình duyệt) phải chạy ở cổng 3001 — cổng mà `CorsConfig` của backend cho phép:

```bash
flutter build web && python -m http.server 3001 --directory build/web
```

## Phân quyền sau khi đăng nhập

| Vai trò | Màn hình |
| --- | --- |
| Khách (chưa đăng nhập) / `USER` | Cửa hàng, giỏ hàng, thanh toán, tài khoản |
| `MARKETING_STAFF` | Khu Marketing (`/staff/marketing/*`) |
| Nhân viên khác | Màn hình "Chưa hỗ trợ trên ứng dụng" — các vai trò này dùng trang quản trị web |

Nhân viên không vào được giỏ hàng / tài khoản khách (giống `web/src/proxy.ts`).

## Các trang

**Khách hàng** — trang chủ (banner HOME_HERO, danh mục, "Dành riêng cho bạn", các khối sản phẩm do
marketing chọn), danh sách sản phẩm + bộ lọc/sắp xếp/phân trang, chi tiết sản phẩm (màu/size/tồn kho,
gợi ý size, bảng tính size, cửa hàng còn hàng, đánh giá, sản phẩm tương tự, phối đồ), tìm kiếm (từ khóa
và bằng ảnh), yêu thích, giỏ hàng (voucher, mua kèm), thanh toán (COD / chuyển khoản, PayOS, QR, tự
cập nhật trạng thái thanh toán), tin tức, đăng nhập/đăng ký/xác thực email/quên mật khẩu, tài khoản (hồ
sơ, số đo, đơn hàng + chi tiết/hủy/trả hàng/đổi phương thức thanh toán, voucher + đồng ý nhận email,
đổi mật khẩu, đánh giá của tôi, hỗ trợ & khiếu nại).

**Marketing** — tổng quan, chỉnh sửa trang chủ (banner đầu trang, khối sản phẩm), bài viết, voucher,
chiến dịch email, hiệu quả.

## Cấu trúc

```
lib/
  core/       cấu hình URL, HTTP client, lưu trữ, theme, định dạng tiền/ngày, toast
  models/     Product, Cart, VoucherOption
  services/   chuyển từ web/src/lib/services/*.ts
  state/      AuthProvider, CartProvider, WishlistProvider (tương đương các React Context)
  widgets/    ProductCard, carousel, giỏ hàng trượt, thẻ voucher, QR chuyển khoản...
  screens/    customer/, account/, auth/, staff/
  router.dart go_router dùng đúng đường dẫn của web, kèm guard theo vai trò
```

Token đăng nhập được lưu bằng `shared_preferences` khi chọn "Ghi nhớ đăng nhập", ngược lại chỉ giữ
trong bộ nhớ (như `sessionStorage` của web).
