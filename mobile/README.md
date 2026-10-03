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

- Gọi API thật trong các trang (hiện là khung + TODO).
- `GET /api/staff/sales/sla` trên backend đang trả `getNewOrders()` chứ không phải danh sách cảnh báo SLA; logic thật nằm ở `SalesOrderService.getSlaWarningOrders()` và chưa được gọi.
- Backend không có RBAC server-side trong build hiện tại; app phải tự ẩn/hiện chức năng theo `permissions` từ `GET /api/auth/me`.
- Backend chưa phân biệt `PICKING` và `PACKING` — cả `picking/complete` và `packing` đều chuyển thẳng sang `PACKED`.