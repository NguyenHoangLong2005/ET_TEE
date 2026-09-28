# 📊 BÁO CÁO AUDIT & KIỂM KÊ HIỆN TRẠNG HỆ THỐNG ET.TEE (PHASE 0)

> **Dự án:** Thương mại điện tử thời trang ET.TEE  
> **Thời điểm kiểm kê:** 26/09/2026  
> **Phương pháp:** Quét và đối chiếu 100% mã nguồn thực tế tại `backend/` (Spring Boot) và `web/` (Next.js App Router).

---

## 1. TỔNG QUAN KIẾN TRÚC & PHẠM VI

- **Backend:** Spring Boot (Java 17/21, Maven), cấu trúc Controller chia theo 3 nhóm đối tượng chính (`controller/admin`, `controller/staff`, `controller/customer`) cùng các controller dùng chung (`AuthController`, `ProductController`, `MarketingController`, `ReviewController`, v.v.).
  - Tổng số controller: **22 controllers**.
  - Tổng số endpoint backend: **193 endpoints**.
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS v4 (`@theme`), Lucide Icons.
  - Tổng số route/page: **94 pages**.
  - Phân hệ quản trị: Admin (`app/(staff)/admin`), Staff (`app/(staff)/staff`), Store Owner (`app/(staff)/store-owner`).
  - Phân hệ khách hàng: Tài khoản (`app/account/*`), Giỏ hàng & Thanh toán (`app/cart`, `app/checkout`), Sản phẩm, Trang chính sách & tiện ích.

---

## 2. KIỂM KÊ TOÀN BỘ ROUTE & PAGE HIỆN CÓ

### 2.1. Phân hệ Admin (`app/(staff)/admin/`) — 12 routes
| Route URL | Đường dẫn file | Mục đích nghiệp vụ |
|---|---|---|
| `/admin/dashboard` | `app/(staff)/admin/dashboard/page.tsx` | Dashboard tổng quan hệ thống, monitoring, audit log |
| `/admin/users` | `app/(staff)/admin/users/page.tsx` | Quản lý người dùng, tạo tài khoản quản trị/nhân viên |
| `/admin/rbac` | `app/(staff)/admin/rbac/page.tsx` | Quản lý vai trò (Role) và phân quyền |
| `/admin/categories` | `app/(staff)/admin/categories/page.tsx` | Quản lý danh mục sản phẩm toàn hệ thống |
| `/admin/logs` | `app/(staff)/admin/logs/page.tsx` | Tra cứu log hệ thống |
| `/admin/audit-logs` | `app/(staff)/admin/audit-logs/page.tsx` | Tra cứu lịch sử kiểm toán hoạt động |
| `/admin/backup` | `app/(staff)/admin/backup/page.tsx` | Quản lý sao lưu dữ liệu |
| `/admin/mailing` | `app/(staff)/admin/mailing/page.tsx` | Lịch sử & cấu hình gửi email hệ thống |
| `/admin/monitoring` | `app/(staff)/admin/monitoring/page.tsx` | Giám sát hiệu năng phần cứng, JVM, Database |
| `/admin/ai-config` | `app/(staff)/admin/ai-config/page.tsx` | Cấu hình model AI & phiên bản gợi ý |
| `/admin/ai-feature-flags` | `app/(staff)/admin/ai-feature-flags/page.tsx` | Quản lý feature flag cho các tính năng AI |
| `/admin/settings/payments-shipping` | `app/(staff)/admin/settings/payments-shipping/page.tsx` | Cấu hình cổng thanh toán & đối tác vận chuyển |

### 2.2. Phân hệ Nhân viên (`app/(staff)/staff/`) — 28 routes
- **Marketing (7 routes):**
  - `/staff/dashboard/marketing` (`app/(staff)/staff/dashboard/marketing/page.tsx`): Tổng quan marketing
  - `/staff/dashboard/marketing/analytics` (`app/(staff)/staff/dashboard/marketing/analytics/page.tsx`): Báo cáo số liệu chiến dịch
  - `/staff/dashboard/marketing/banners` (`app/(staff)/staff/dashboard/marketing/banners/page.tsx`): Quản lý banner hiển thị
  - `/staff/dashboard/marketing/campaigns` (`app/(staff)/staff/dashboard/marketing/campaigns/page.tsx`): Quản lý chiến dịch khuyến mãi
  - `/staff/dashboard/marketing/posts` (`app/(staff)/staff/dashboard/marketing/posts/page.tsx`): Quản lý bài viết tin tức
  - `/staff/dashboard/marketing/product-placement` (`app/(staff)/staff/dashboard/marketing/product-placement/page.tsx`): Bố trí sản phẩm trang chủ
  - `/staff/dashboard/marketing/vouchers` (`app/(staff)/staff/dashboard/marketing/vouchers/page.tsx`): Mã giảm giá
- **Sales (3 routes):**
  - `/staff/dashboard/sales` (`app/(staff)/staff/dashboard/sales/page.tsx`): Dashboard bán hàng
  - `/staff/dashboard/sales/dashboard` (`app/(staff)/staff/dashboard/sales/dashboard/page.tsx`): Thống kê doanh số
  - `/staff/dashboard/sales/orders` (`app/(staff)/staff/dashboard/sales/orders/page.tsx`): Quản lý & xác nhận đơn hàng
- **Shipping (5 routes):**
  - `/staff/dashboard/shipping` (`app/(staff)/staff/dashboard/shipping/page.tsx`): Dashboard vận chuyển
  - `/staff/dashboard/shipping/dashboard` (`app/(staff)/staff/dashboard/shipping/dashboard/page.tsx`): Thống kê vận đơn
  - `/staff/dashboard/shipping/orders` (`app/(staff)/staff/dashboard/shipping/orders/page.tsx`): Đơn hàng sẵn sàng giao
  - `/staff/dashboard/shipping/shipments` (`app/(staff)/staff/dashboard/shipping/shipments/page.tsx`): Quản lý vận đơn & tracking
  - `/staff/dashboard/shipping/cod` (`app/(staff)/staff/dashboard/shipping/cod/page.tsx`): Đối soát tiền COD
  - `/staff/dashboard/shipping/exceptions` (`app/(staff)/staff/dashboard/shipping/exceptions/page.tsx`): Sự cố giao hàng
- **Warehouse (11 routes):**
  - `/staff/dashboard/warehouse` (`app/(staff)/staff/dashboard/warehouse/page.tsx`): Dashboard kho vận
  - `/staff/dashboard/warehouse/dashboard` (`app/(staff)/staff/dashboard/warehouse/dashboard/page.tsx`): Tổng hợp xuất nhập tồn
  - `/staff/dashboard/warehouse/inventory` (`app/(staff)/staff/dashboard/warehouse/inventory/page.tsx`): Danh mục tồn kho
  - `/staff/dashboard/warehouse/orders` (`app/(staff)/staff/dashboard/warehouse/orders/page.tsx`): Đơn hàng cần đóng gói
  - `/staff/dashboard/warehouse/picking` (`app/(staff)/staff/dashboard/warehouse/picking/page.tsx`): Lấy hàng theo danh sách
  - `/staff/dashboard/warehouse/packing` (`app/(staff)/staff/dashboard/warehouse/packing/page.tsx`): Đóng gói kiện hàng
  - `/staff/dashboard/warehouse/receiving` (`app/(staff)/staff/dashboard/warehouse/receiving/page.tsx`): Nhập kho hàng mới
  - `/staff/dashboard/warehouse/replenishment` (`app/(staff)/staff/dashboard/warehouse/replenishment/page.tsx`): Bổ sung tồn kho kệ
  - `/staff/dashboard/warehouse/reservations` (`app/(staff)/staff/dashboard/warehouse/reservations/page.tsx`): Quản lý giữ hàng tạm
  - `/staff/dashboard/warehouse/shipments` (`app/(staff)/staff/dashboard/warehouse/shipments/page.tsx`): Kiện hàng xuất kho
  - `/staff/dashboard/warehouse/stock-count` (`app/(staff)/staff/dashboard/warehouse/stock-count/page.tsx`): Kiểm kê tồn kho định kỳ
  - `/staff/dashboard/warehouse/adjustments` (`app/(staff)/staff/dashboard/warehouse/adjustments/page.tsx`): Lịch sử điều chỉnh kho
- **Khác (5 routes):**
  - `/staff/banners` (`app/(staff)/staff/banners/page.tsx`)
  - `/staff/reviews` (`app/(staff)/staff/reviews/page.tsx`): Duyệt đánh giá sản phẩm
  - `/staff/support` (`app/(staff)/staff/support/page.tsx`): Hỗ trợ khách hàng
  - `/staff/tickets` (`app/(staff)/staff/tickets/page.tsx`): Hàng đợi ticket CSKH
  - `/staff/vouchers` (`app/(staff)/staff/vouchers/page.tsx`)

### 2.3. Phân hệ Chủ cửa hàng (`app/(staff)/store-owner/`) — 12 routes
| Route URL | Đường dẫn file | Mục đích nghiệp vụ |
|---|---|---|
| `/store-owner/dashboard` | `app/(staff)/store-owner/dashboard/page.tsx` | Báo cáo doanh thu, đơn hàng, tồn kho chi nhánh |
| `/store-owner/orders` | `app/(staff)/store-owner/orders/page.tsx` | Quản lý toàn diện đơn hàng cửa hàng |
| `/store-owner/products` | `app/(staff)/store-owner/products/page.tsx` | Quản lý hiển thị sản phẩm tại cửa hàng |
| `/store-owner/inventory` | `app/(staff)/store-owner/inventory/page.tsx` | Kiểm tra tồn kho thực tế tại shop |
| `/store-owner/staff` | `app/(staff)/store-owner/staff/page.tsx` | Quản lý nhân viên chi nhánh, phân công vai trò |
| `/store-owner/shifts` | `app/(staff)/store-owner/shifts/page.tsx` | Xếp ca làm việc nhân sự |
| `/store-owner/approvals` | `app/(staff)/store-owner/approvals/page.tsx` | Phê duyệt yêu cầu điều chỉnh kho & khuyến mãi |
| `/store-owner/categories` | `app/(staff)/store-owner/categories/page.tsx` | Cấu hình danh mục ưu tiên tại shop |
| `/store-owner/promotions` | `app/(staff)/store-owner/promotions/page.tsx` | Quản lý khuyến mãi nội bộ shop |
| `/store-owner/manufacturers` | `app/(staff)/store-owner/manufacturers/page.tsx` | Danh sách nhà sản xuất liên kết |
| `/store-owner/suppliers` | `app/(staff)/store-owner/suppliers/page.tsx` | Danh sách nhà cung ứng |
| `/store-owner/logs` | `app/(staff)/store-owner/logs/page.tsx` | Nhật ký hoạt động chi nhánh |

### 2.4. Phân hệ Khách hàng & Công khai — 22 routes
- **Tài khoản cá nhân (`app/account/*`):** `/account/profile`, `/account/orders`, `/account/orders/[orderCode]`, `/account/reviews`, `/account/measurements`, `/account/change-password`.
- **Thanh toán & Mua sắm:** `/cart`, `/checkout`, `/order-success/[orderCode]`, `/wishlist`, `/products`, `/products/[slug]`.
- **Trải nghiệm & Khám phá:** `/`, `/style-quiz`, `/size-guide`, `/stores`.
- **Xác thực (`app/auth/*`):** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`.
- **Thông tin & Chính sách:** `/about`, `/contact`, `/faq`, `/news`, `/news/[slug]`, `/careers`, `/policy`, `/policy/shipping`, `/policy/return`, `/policy/warranty`, `/policy/membership`, `/terms`, `/privacy`.

---

## 3. BẢNG ĐỐI CHIẾU ENDPOINT BACKEND VÀ HIỆN TRẠNG UI FRONTEND

- **Tổng số endpoint backend:** 193
- **Đã kết nối UI:** 123
- **Chưa kết nối / Chưa có UI tương xứng (Orphaned / Underutilized):** **70 endpoints**

### Danh sách 70 Endpoints chưa được khai thác hoặc thiếu UI:

| Phân hệ / Controller | HTTP Method & Path | Tên hàm backend | Hiện trạng UI & Vấn đề phát hiện |
|---|---|---|---|
| **Customer Support Ticket**<br>`CustomerTicketController` | `POST /api/customer/tickets`<br>`GET /api/customer/tickets/my-tickets`<br>`GET /api/customer/tickets/{id}`<br>`POST /api/customer/tickets/{id}/messages` | `createCustomerTicket`<br>`getCustomerTickets`<br>`getCustomerTicketById`<br>`addCustomerMessage` | **UI thiếu hoàn toàn**: Backend đã có trọn vẹn luồng ticket khách hàng (tạo ticket, xem danh sách, trao đổi tin nhắn 2 chiều với CSKH), nhưng phía khách hàng (`account/*`) không hề có trang `account/tickets`. |
| **RBAC Chi tiết**<br>`AdminRbacController` | `GET /api/admin/rbac/roles/{code}/permissions`<br>`POST /api/admin/rbac/roles/{code}/permissions`<br>`DELETE /api/admin/rbac/roles/{code}/permissions/{permission}` | `getPermissions`<br>`assignPermission`<br>`revokePermission` | **UI thiếu chức năng gán quyền**: Trang `admin/rbac` hiện chỉ xem danh sách role, chưa có giao diện bật/tắt từng checkbox permission cụ thể cho từng role. |
| **Cài đặt Hệ thống**<br>`AdminSystemController` | `GET /api/admin/settings`<br>`POST /api/admin/settings` | `getSettings`<br>`saveSettings` | **Chưa nối UI**: Cấu hình hệ thống `SystemSetting` chưa có màn hình quản trị hoàn chỉnh. |
| **Sao lưu Dữ liệu**<br>`AdminBackupController` | `GET /api/admin/backup`<br>`POST /api/admin/backup/create` | `listBackups`<br>`createBackup` | **Chưa nối UI**: Màn hình `admin/backup` còn tĩnh hoặc mock, chưa gọi API sao lưu thật. |
| **Quản trị User**<br>`AdminUserController` | `PATCH /api/admin/users/{id}/status`<br>`POST /api/admin/users/{id}/reset-password` | `updateUserStatus`<br>`resetUserPassword` | **Thiếu nút hành động**: `admin/users` chưa có nút khóa/mở khóa tài khoản (Active/Banned/Locked) và nút gửi lại link/mật khẩu reset. |
| **Bán hàng & Đơn hàng**<br>`StaffSalesController` | `GET /api/staff/sales/orders/{id}/notes`<br>`GET /api/staff/sales/orders/{id}/status-info`<br>`GET /api/staff/sales/orders/{id}/transitions`<br>`GET /api/staff/sales/orders/{id}/history`<br>`PUT /api/staff/sales/orders/{id}/verify`<br>`POST /api/staff/sales/orders/{id}/confirm`<br>`POST /api/staff/sales/orders/{id}/cancel`<br>`POST /api/staff/sales/orders/{id}/notes`<br>`POST /api/staff/sales/orders/{id}/reservations`<br>`GET /api/staff/sales/statuses`<br>`GET /api/staff/sales/statuses/{status}/display` | `orderNotes`<br>`orderStatusInfo`<br>`allowedTransitions`<br>`orderHistory`<br>`verifyOrder`<br>`confirmOrder`<br>`cancelOrder`<br>`addNote`<br>`requestReservation`<br>`allStatuses`<br>`statusDisplay` | **State Machine chưa khai thác**: Backend cung cấp đầy đủ API chuyển trạng thái đơn (xác nhận, hủy, duyệt, ghi chú, lịch sử chuyển trạng thái), nhưng UI sales order đang dùng bảng tĩnh, chưa có modal xem history và thực hiện transition hợp lệ. |
| **Vận chuyển & Vận đơn**<br>`StaffShippingController` | `GET /api/staff/shipping/ready-orders`<br>`PUT /api/staff/shipping/shipments/{id}/tracking-code`<br>`POST /api/staff/shipping/shipments/{id}/handover`<br>`POST /api/staff/shipping/shipments/{id}/shipping`<br>`PUT /api/staff/shipping/exceptions/{id}/resolve`<br>`POST /api/staff/shipping/shipments/{id}/proof`<br>`POST /api/staff/shipping/cod/{id}/reconcile` | `readyOrders`<br>`updateTrackingCode`<br>`handover`<br>`startShipping`<br>`resolveException`<br>`proofOfDelivery`<br>`reconcileCod` | **Nghiệp vụ vận hành bị thiếu**: Phía shipping dashboard đang gọi tạm `store-owner/orders`. Các chức năng tải bằng chứng giao hàng (Proof of delivery), xử lý ngoại lệ giao hàng, bàn giao vận chuyển và đối soát COD theo lô chưa được nối vào UI. |
| **Kho vận & Tồn kho**<br>`StaffWarehouseController` | `POST /api/staff/warehouse/inbound/{id}/count`<br>`PUT /api/staff/warehouse/inventory/{id}/location`<br>`POST /api/staff/warehouse/inventory/{id}/adjustments`<br>`POST /api/staff/warehouse/adjustments/{id}/approve`<br>`POST /api/staff/warehouse/reservations/{id}/approve`<br>`POST /api/staff/warehouse/reservations/{id}/reject`<br>`POST /api/staff/warehouse/orders/{id}/picking`<br>`POST /api/staff/warehouse/orders/{id}/picking/complete`<br>`GET /api/staff/warehouse/orders/{id}/label`<br>`POST /api/staff/warehouse/orders/{id}/packing`<br>`POST /api/staff/warehouse/orders/{id}/label`<br>`POST /api/staff/warehouse/orders/{id}/handover` | `countInbound`<br>`updateLocation`<br>`createAdjustment`<br>`approveAdjustment`<br>`approveReservation`<br>`rejectReservation`<br>`startPicking`<br>`completePicking`<br>`labelInfo`<br>`pack`<br>`label`<br>`handover` | **Quy trình kho đứt đoạn**: Backend có đầy đủ quy trình picking $\rightarrow$ packing $\rightarrow$ label $\rightarrow$ handover và duyệt phiếu điều chỉnh tồn kho, nhưng UI warehouse hiện tại chỉ hiển thị bảng danh sách, các nút bấm thao tác nghiệp vụ chưa gắn kết với API backend. |
| **CSKH Ticket Staff**<br>`StaffSupportTicketController` | `PATCH /api/staff/support/tickets/{id}/status`<br>`POST /api/staff/support/tickets/{id}/messages`<br>`PATCH /api/staff/support/tickets/{id}/assign`<br>`GET /api/staff/support/tickets/{id}/assignable-staff` | `updateTicketStatus`<br>`addStaffMessage`<br>`assignTicket`<br>`linkOrderToTicket` | **Chưa có giao diện chat/xử lý ticket**: Nhân viên CSKH chưa có màn hình chi tiết ticket để chat với khách, đổi trạng thái và phân công người xử lý. |
| **Chủ shop & Nhân sự**<br>`StoreOwnerController` | `PUT /api/store-owner/products/{productId}/config`<br>`GET /api/store-owner/evaluations`<br>`POST /api/store-owner/evaluations` | `updateShopProductConfig`<br>`getEvaluations`<br>`createEvaluation` | **Thiếu màn hình đánh giá nhân viên**: Backend có entity `StaffPerformanceEvaluation`, API đánh giá nhân viên nhưng trang `store-owner/staff` chưa có tab Đánh giá hiệu suất. |
| **Đánh giá Sản phẩm**<br>`ReviewController` | `GET /api/products/{slug}/reviews`<br>`GET /api/products/{slug}/reviews/eligibility`<br>`POST /api/products/{slug}/reviews` | `getReviews`<br>`checkEligibility`<br>`createReview` | **Chưa kiểm tra điều kiện đánh giá**: Khách hàng chưa được gọi API `checkEligibility` (chỉ cho phép đánh giá khi đơn hàng đã hoàn tất). |
| **AI Gợi ý & Phối đồ**<br>`ProductController` | `GET /api/products/{slug}/similar`<br>`GET /api/products/{slug}/outfits` | `getSimilarProducts`<br>`getOutfits` | **Chưa khai thác trên trang chi tiết**: Trang sản phẩm `/products/[slug]` chưa hiển thị khối "Sản phẩm tương tự" và "Bộ phối trang phục gợi ý" từ các endpoint này. |

---

## 4. ĐÁNH GIÁ CƠ CHẾ PHÂN QUYỀN (FE VS BE DISCREPANCY)

### 4.1. Phía Backend (Rất mạnh & Chi tiết)
- Hệ thống hỗ trợ mô hình RBAC 2 tầng chuẩn:
  1. `RoleEntity`: Các vai trò như `ADMIN`, `SUPER_ADMIN`, `SHOP_OWNER`, `SALES_STAFF`, `WAREHOUSE_STAFF`, `SHIPPING_STAFF`, `CSKH_STAFF`, `MARKETING_STAFF`, `USER`.
  2. `RolePermissionEntity`: Lưu danh sách các quyền hạn cụ thể (hơn 30 permission trong `PermissionConstants`: `MANAGE_SHOP_STAFF`, `MANAGE_SHOP_SHIFT`, `MANAGE_WAYBILL`, `MANAGE_INVENTORY`, `APPROVE_PROMOTION`, v.v.).
- Backend bảo vệ endpoint bằng `@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants)...)")`.
- Endpoint `GET /api/auth/me` **đã trả về đầy đủ mảng `permissions: List<String>`**.

### 4.2. Phía Frontend (Còn phân mảnh & Có độ lệch)
1. **Lệch khóa lưu trữ (Storage Key):**
   - File `RoleGate.tsx` đọc `localStorage.getItem('user_info')`.
   - File `lib/auth.ts` và `AuthContext.tsx` lại lưu vào `AUTH_STORAGE.user = 'ettee_user'`.
   - **Xác minh thực tế mức độ ảnh hưởng của `RoleGate.tsx`:** Quét toàn bộ mã nguồn `web/src` xác nhận `RoleGate.tsx` **HOÀN TOÀN KHÔNG được import ở bất kỳ route đang active nào** trong `app/` (chỉ còn tồn tại ở thư mục cô lập `web/src/_hidden_routes/legacy_staff/marketing/*` — vốn có tiền tố `_` nên không tham gia routing của Next.js App Router). Toàn bộ phân hệ quản trị thật hiện đang được bảo vệ bởi `app/(staff)/layout.tsx` (kiểm tra `getStoredUser()`) và `PermissionGuard.tsx`. Do đó, không có trang nào đang chạy thực tế bị khóa truy cập bởi `RoleGate.tsx`. Quyết định chuẩn: Loại bỏ component chết này cùng các trang legacy trong `_hidden_routes`.
2. **Kiểm tra Role chuỗi cứng thay vì Permission:**
   - Nhiều component (`RoleGate`, layout checks) chỉ so khớp `allow = ['MARKETING_STAFF', 'ADMIN']`. Nếu một role mới được tạo hoặc quyền được tùy biến tại backend (`AdminRbacController`), frontend sẽ từ chối truy cập dù backend cho phép.
3. **Lúc Login chưa nạp Permissions:**
   - Trong `AuthService.java`, phương thức `login()` khởi tạo `AuthResponse` nhưng chưa gọi `response.setPermissions(...)` (chỉ có endpoint `/api/auth/me` gọi). Do đó, khi vừa đăng nhập xong, nếu FE chỉ đọc token hoặc body login mà không gọi ngay `/me`, mảng permissions sẽ bị rỗng.

---

## 5. BASELINE ĐÁNH GIÁ HIỆN TRẠNG UI (TRƯỚC KHI NÂNG CẤP)

| Trang kiểm tra | Hiện trạng giao diện | Vấn đề UX/UI phát hiện | Điểm cần nâng cấp |
|---|---|---|---|
| **1. Admin Dashboard**<br>`admin/dashboard` | Bố cục gồm các StatCard hiển thị số lượng user, monitoring, email logs và bảng audit log. Màu sắc trung tính. | Chưa có biểu đồ trực quan (chart); Bảng audit log tự viết thẻ `<table>` riêng; Thiếu lọc nhanh theo ngày tháng; Loading dùng spinner đơn giản. | - Chuẩn hóa layout theo `PageHeader` + `DataTable` chung.<br>- Bổ sung chart xu hướng hoạt động.<br>- Thay spinner bằng Skeleton loading. |
| **2. Staff Shipping Dashboard**<br>`staff/dashboard/shipping` | Card thống kê đơn chờ lấy / đang giao / đã giao. Bảng đơn hàng gần đây. | Đang gọi chéo API của `store-owner` thay vì `StaffShippingController`; Chưa có các nút thao tác giao nhận, tải ảnh bằng chứng giao (Proof), xử lý sự cố. | - Chuyển sang gọi đúng API `/api/staff/shipping/*`.<br>- Bổ sung modal tải ảnh bằng chứng giao hàng.<br>- Phân cấp màu sắc badge trạng thái theo Design System chung. |
| **3. Store Owner Dashboard**<br>`store-owner/dashboard` | Đầy đủ thẻ doanh thu, đơn hàng, tồn kho; Có biểu đồ SVG tự vẽ (Bar chart, Donut chart). | Biểu đồ SVG tự tính toán thủ công dễ vỡ layout trên tablet/mobile nhỏ; Bộ lọc thời gian còn tĩnh; Bảng đơn hàng gần đây chưa có liên kết nhanh sang trang chi tiết. | - Tối ưu lại biểu đồ responsive.<br>- Chuẩn hóa các card thống kê theo token mới.<br>- Liên kết mượt mà sang `store-owner/orders`. |
| **4. Account Layout & Profile**<br>`account/*` | Sidebar gồm 5 mục (Hồ sơ, Số đo, Đơn hàng, Đổi mật khẩu, Đánh giá). Form thông tin cá nhân rõ ràng. | Thiếu mục **Trung tâm hỗ trợ / Yêu cầu bảo hành (Support Tickets)** dù backend đã có trọn vẹn API; Chưa có mục **Kho voucher của tôi**. | - Thêm route & giao diện `account/tickets`.<br>- Thêm tab xem voucher cá nhân được CSKH tặng (`CskhVoucherGrant`). |
| **5. Giỏ hàng & Thanh toán**<br>`cart`, `checkout` | Bố cục 2 cột (Danh sách sản phẩm + Tóm tắt đơn hàng); Ô áp mã voucher hoạt động được. | Validate form checkout chưa có inline feedback rõ ràng (dùng toast báo lỗi chung); Trên mobile, khối tóm tắt và nút Đặt hàng bị đẩy xuống cuối trang rất dài. | - Bổ sung inline validation cho từng ô input (họ tên, SĐT, địa chỉ).<br>- Tối ưu thanh checkout cố định ở đáy màn hình trên mobile (Sticky checkout bar). |

---

## 6. ĐÁNH GIÁ RESPONSIVE TRÊN CÁC KÍCH THƯỚC MÀN HÌNH

- **Desktop ($\ge$ 1440px):**
  - Khu vực quản trị hiển thị đầy đủ, thanh bên (Sidebar) cố định rõ ràng.
  - Khu vực khách hàng thoáng đãng, hệ thống lưới (Grid) 4–5 cột đều đẹp.
- **Tablet (768px – 1024px):**
  - Quản trị: Sidebar bắt đầu chiếm tỷ lệ lớn diện tích màn hình. Bảng dữ liệu dài bắt đầu phát sinh cuộn ngang nhưng không có thanh chỉ báo trực quan.
  - Khách hàng: Lưới sản phẩm co về 2–3 cột hợp lý; tuy nhiên form tài khoản và checkout cần căn chỉnh lại padding để tối ưu không gian hiển thị.
- **Mobile (375px – 430px):**
  - Quản trị: Đã có menu drawer đóng mở, nhưng các trang danh sách dữ liệu (DataTable) chưa có cơ chế hiển thị dạng Card trên mobile, khiến bảng bị tràn ngang khó thao tác bằng ngón tay.
  - Khách hàng: Header và drawer giỏ hàng hiển thị tốt; Luồng checkout cần rút gọn các bước cuộn màn hình để tránh tỷ lệ bỏ rơi giỏ hàng.

---

## 7. KẾ HOẠCH HÀNH ĐỘNG CHO CÁC PHASE TIẾP THEO

1. **Phase 1 (Design System):** Mở rộng tokens màu ngữ nghĩa (`success`, `warning`, `danger`, `info`) và bảng màu admin trung tính trong `globals.css`; xây dựng bộ component nền tảng chuẩn (`DataTable`, `StatusBadge`, `PageHeader`, `EmptyState`, `Skeleton`, `ConfirmModal`).
2. **Phase 2 (UI Quản trị):** Áp dụng đồng bộ bộ component chuẩn cho tất cả 52 trang quản trị (Admin, Staff, Store Owner), chuẩn hóa layout, breadcrumb và responsive.
3. **Phase 3 (Chức năng Quản trị):** Kết nối 70 endpoint mồ côi (RBAC permission toggles, quy trình kho picking/packing/labels, quy trình vận chuyển proof/exceptions/cod, quản lý ticket CSKH, đánh giá nhân viên).
4. **Phase 4 & 5 (UI & Chức năng Khách hàng):** Bổ sung trung tâm hỗ trợ ticket cho khách hàng (`account/tickets`), hoàn thiện luồng đánh giá sản phẩm, gợi ý size từ số đo, tối ưu mobile checkout.
5. **Phase 6 & 7 (Kiểm thử & Bàn giao):** Chạy kiểm thử toàn diện `next build` và `mvn test`, kiểm tra hồi quy và bàn giao `HANDOVER_REPORT.md`.
