<<<<<<< HEAD
# ET Tee Staff Mobile (Flutter)

App cho 3 vai trò nhân viên nội bộ, dùng chung một codebase, điều hướng theo role sau khi đăng nhập.

## Cấu trúc thư mục

```
mobile/
├── lib/
│   ├── main.dart                 # bootstrap: config -> DI -> runApp
│   ├── app.dart                  # MaterialApp.router, theme, locale
│   ├── core/                     # hạ tầng dùng chung, không phụ thuộc nghiệp vụ
│   │   ├── config/               # AppConfig (base URL, env, base path theo role)
│   │   ├── di/                   # get_it injector
│   │   ├── error/                # AppException + các biến thể
│   │   ├── network/              # Dio client, ApiResponse envelope, interceptors
│   │   ├── router/               # go_router + guards phân tuyến theo role
│   │   ├── storage/              # token/refresh token (flutter_secure_storage)
│   │   ├── theme/                # AppTheme, AppColors, AppSpacing, AppRadius
│   │   ├── utils/                # Formatters (tiền tệ, ngày, thời lượng)
│   │   └── widgets/              # EmptyState, ErrorRetryView, StatusBadge, PermissionGate
│   ├── data/
│   │   ├── datasources/          # remote: sales/warehouse/shipping
│   │   ├── models/               # JSON -> entity
│   │   └── repositories/         # *RepositoryImpl
│   ├── domain/
│   │   ├── entities/             # Order, OrderStatus, ShipmentStatus, AppRole
│   │   ├── repositories/         # hợp đồng abstract
│   │   └── usecases/             # một use case = một hành động nghiệp vụ
│   ├── presentation/
│   │   ├── auth/                 # đăng nhập
│   │   ├── shell/                # khung chung sau khi login
│   │   ├── shared/               # widget dùng chung giữa 3 role
│   │   ├── sales/
│   │   │   ├── features/new_orders/
│   │   │   ├── features/order_verify/
│   │   │   ├── features/order_confirm_cancel/
│   │   │   ├── features/order_notes/
│   │   │   ├── features/hold_request/
│   │   │   ├── features/sla_monitor/
│   │   │   ├── pages/ + widgets/
│   │   ├── warehouse/
│   │   │   ├── features/inbound/
│   │   │   ├── features/counting/
│   │   │   ├── features/locations/
│   │   │   ├── features/adjustments/
│   │   │   ├── features/reservations/
│   │   │   ├── features/picking/
│   │   │   ├── features/packing/
│   │   │   ├── features/label_printing/
│   │   │   ├── features/handover/
│   │   │   ├── features/stocktake/
│   │   │   ├── features/replenishment/
│   │   │   ├── pages/ + widgets/
│   │   └── shipping/
│   │       ├── features/ready_packages/
│   │       ├── features/tracking_code/
│   │       ├── features/handover_confirm/
│   │       ├── features/delivery_exceptions/
│   │       ├── features/proof_of_delivery/
│   │       ├── features/cod_reconciliation/
│   │       ├── pages/ + widgets/
│   └── l10n/                     # chuỗi hiển thị (tiếng Việt)
├── assets/{images,icons,fonts}/
└── test/{unit,widget,mock}/
```

Quy ước: mỗi thư mục `features/<ten>` chứa `*_page.dart`, `*_controller.dart`, `*_state.dart` và widget riêng. `core/` không được import từ `presentation/<role>` nếu đó là thứ riêng của role.

## Mapping vai trò -> tính năng

**Bán hàng** (`SALES_STAFF`) -> `lib/presentation/sales`
| Tính năng | Endpoint backend |
|---|---|
| Kiểm tra đơn mới | `GET /api/staff/sales/orders/new` |
| Xác minh / thông tin nhận hàng | `PUT /api/staff/sales/orders/{id}/verify` |
| Xác nhận hoặc hủy đơn | `POST .../confirm`, `POST .../cancel` |
| Ghi chú xử lý | `POST /api/staff/sales/orders/{id}/notes` |
| Tạo yêu cầu giữ hàng | `POST /api/staff/sales/orders/{id}/reservations` |
| Theo dõi SLA đơn hàng | `GET /api/staff/sales/sla` |

**Kho** (`WAREHOUSE_STAFF`) -> `lib/presentation/warehouse`
| Tính năng | Endpoint backend |
|---|---|
| Nhập kho | `POST /api/staff/warehouse/inbound` |
| Kiểm đếm | `POST /api/staff/warehouse/inbound/{id}/count` |
| Quản lý vị trí hàng | `PUT /api/staff/warehouse/inventory/{id}/location` |
| Điều chỉnh chênh lệch (có phê duyệt) | `POST .../inventory/{id}/adjustments`, `POST .../adjustments/{id}/approve` |
| Giữ hàng cho đơn | `POST /api/staff/warehouse/reservations/{id}/approve` \| `/reject` |
| Picking | `POST .../orders/{id}/picking`, `.../picking/complete` |
| Packing | `POST .../orders/{id}/packing` |
| In tem | `GET/POST .../orders/{id}/label` |
| Bàn giao hãng vận chuyển | `POST .../orders/{id}/handover` |
| Kiểm kê | `GET/POST/PUT /api/staff/warehouse/stocktakes` |
| Đề xuất nhập thêm | `GET /api/staff/warehouse/replenishment` |

**Vận chuyển** (`SHIPPING_STAFF`) -> `lib/presentation/shipping`
| Tính năng | Endpoint backend |
|---|---|
| Nhận danh sách kiện đã đóng gói | `GET /api/staff/shipping/ready-orders` |
| Tạo/gắn mã vận đơn | `POST /api/staff/shipping/shipments`, `PUT .../shipments/{id}/tracking-code` |
| Xác nhận bàn giao | `POST .../shipments/{id}/handover` |
| Cập nhật ngoại lệ giao hàng | `POST /api/staff/shipping/exceptions`, `PUT .../exceptions/{id}/resolve` |
| Bằng chứng giao hàng | `POST .../shipments/{id}/proof` |
| Đối soát COD | `GET/POST /api/staff/shipping/cod/reconciliation` |

## Chạy

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8081
```

`10.0.2.2` là host loopback của Android emulator. Backend Spring Boot chạy port `8081`.

## Việc chưa làm

- Các màn hình nghiệp vụ gọi API backend trực tiếp; thao tác được ẩn theo `permissions` từ `GET /api/auth/me` và vẫn được backend kiểm tra quyền.
- Ảnh bằng chứng giao hàng được tải qua `POST /api/staff/shipping/proof-image`, sau đó URL trả về được gắn vào bằng chứng giao hàng.
- Duyệt phiếu điều chỉnh tồn kho là quyền của chủ cửa hàng (`APPROVE_SHOP_PROMO`), không phải quyền của nhân viên kho; mobile chỉ tạo phiếu và theo dõi trạng thái chờ duyệt.
- Backend hiện chuyển đơn sang `PACKED` sau thao tác đóng gói; picking và packing chưa có trạng thái trung gian riêng.
=======
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
>>>>>>> main
