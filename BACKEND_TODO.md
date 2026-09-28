# BACKEND BACKLOG (Các API Cluster còn thiếu)

> [!IMPORTANT]
> Tài liệu này tổng hợp danh sách các API Cluster còn thiếu trên hệ thống Backend (Spring Boot) cần bổ sung trước khi kích hoạt lại 4 module UI tương ứng trên Frontend.

---

## 1. User & RBAC CRUD Cluster (`/api/admin/users`, `/api/admin/rbac/*`) ✅
- **Mô tả**: Quản lý người dùng, mã nhân viên (employeeCode), phân quyền vai trò (RBAC), tạo/sửa/khóa tài khoản kèm lý do, gán vai trò & shop chi nhánh.
- **Tình trạng**: ✅ **Đã hoàn thành 100% (Backend + Integration Tests + Frontend + Build verified)**
- **Endpoints đã xây dựng & Nối thật**:
  - `GET /api/admin/users`: Lấy danh sách người dùng (Phân trang, tìm kiếm từ khóa email/tên/mã NV, lọc vai trò & trạng thái).
  - `GET /api/admin/users/{id}`: Lấy chi tiết 1 người dùng + danh sách quyền permissions.
  - `POST /api/admin/users`: Tạo tài khoản staff/admin mới (Validate mã NV `employeeCode` trùng 409, email trùng 409, ràng buộc nhất quán `shopId` theo vai trò).
  - `PUT /api/admin/users/{id}`: Cập nhật thông tin người dùng (Validate role change, bảo vệ Admin duy nhất 400).
  - `PATCH /api/admin/users/{id}/status`: Khóa / Mở khóa tài khoản (Validate bắt buộc `lockReason`, lưu audit `lockedBy`, `lockedAt`, chặn Admin tự khóa chính mình 400, chặn khóa Admin duy nhất 400).
  - `POST /api/admin/users/{id}/reset-password`: Khôi phục mật khẩu (Cấp mật khẩu tạm ngẫu nhiên trả về 1 lần duy nhất trong response, đặt cờ `mustChangePassword = true`, không log mật khẩu).
  - `GET /api/admin/rbac/roles`: Lấy danh sách tất cả các vai trò & danh sách quyền permissions tương ứng.

---

## 2. Category CRUD Cluster (`/api/categories`, `/api/admin/categories`, `/api/store-owner/categories/config`) ✅
- **Mô tả**: Quản lý cây danh mục sản phẩm đa cấp, phân quyền RBAC, chống chu trình (cycle detection), slug phân cấp, kéo-thả reorder, và cấu hình danh mục shop riêng.
- **Tình trạng**: ✅ **Đã hoàn thành 100% (Backend + Frontend + Build verified)**
- **Endpoints đã xây dựng & Nối thật**:
  - `GET /api/categories`: Lấy danh mục public cho Storefront (Public).
  - `GET /api/admin/categories/tree`: Lấy cấu hình Cây danh mục đa cấp (Nested Tree) không phân trang.
  - `GET /api/admin/categories`: Lấy danh sách danh mục phẳng phân trang + tìm kiếm.
  - `GET /api/admin/categories/{id}`: Lấy chi tiết 1 danh mục.
  - `POST /api/admin/categories`: Tạo danh mục mới (Kiểm tra trùng tên cùng cấp cha, tự động sinh slug phân cấp `parent-child`).
  - `PUT /api/admin/categories/{id}`: Sửa danh mục (Kiểm tra chống chu trình cycle detection, slug bất biến).
  - `PATCH /api/admin/categories/reorder`: Cập nhật thứ tự hiển thị kéo-thả hàng loạt.
  - `DELETE /api/admin/categories/{id}`: Xóa danh mục (An toàn: Chặn nếu có danh mục con hoặc sản phẩm đính kèm).
  - `GET/PUT /api/store-owner/categories/config`: Cấu hình danh mục ưu tiên hiển thị cho từng Shop (Lấy shopId tự động từ JWT).

---

## 3. Store Owner Cluster (`/api/store-owner/*`) ✅
- **Mô tả**: Quản lý sản phẩm & giá local tại shop, phê duyệt Voucher & phiếu điều chỉnh tồn kho, phân ca làm việc & đánh giá hiệu suất nhân sự, nhật ký hoạt động shop.
- **Tình trạng**: ✅ **Đã hoàn thành 100% (Backend + Integration Tests + Frontend + Build verified)**
- **Endpoints đã xây dựng & Nối thật**:
  - `GET /api/store-owner/products`: Danh sách sản phẩm chi nhánh phân trang ghép cấu hình local.
  - `GET /api/store-owner/products/{productId}`: Xem chi tiết cấu hình giá & trạng thái bán local tại shop.
  - `PUT /api/store-owner/products/{productId}/config`: Điều chỉnh giá niêm yết/khuyến mãi local & bật/tắt bán tại shop (Validate `localPromoPrice <= localPrice`).
  - `GET /api/store-owner/approvals/pending`: Lấy danh sách tổng hợp phê duyệt chờ xử lý đọc trực tiếp từ Marketing Voucher & Warehouse Inventory.
  - `PUT /api/store-owner/approvals/{approvalId}`: Xử lý duyệt/từ chối Voucher (Cập nhật `status = ACTIVE`) hoặc Phiếu điều chỉnh tồn kho (Cập nhật `status = APPROVED` và số tồn kho thực tế).
  - `GET/POST/PUT/DELETE /api/store-owner/work-shifts`: Phân ca làm việc cho nhân sự chi nhánh (`MORNING`, `AFTERNOON`, `EVENING`, `FULL_DAY`).
  - `GET/POST /api/store-owner/evaluations`: Đánh giá hiệu suất nhân sự hàng tháng (điểm rating 1-5 sao, % KPI, nhận xét).
  - `GET /api/store-owner/audit-logs`: Nhật ký hoạt động của nhân viên tự động lọc theo `shopId` của Store Owner.

---

## 4. Support Ticket Cluster (`/api/staff/support/tickets`, `/api/customer/tickets/*`) ⏳ (Hoàn thành phần Ticket & Live Chat)
- **Mô tả**: Quản lý yêu cầu hỗ trợ (Support Ticket) & hội thoại Live Chat 2 chiều giữa Khách hàng và Nhân viên CSKH/Admin, phân công ticket & leo thang theo chi nhánh, bảo mật IDOR & State Machine chuyển trạng thái ticket.
- **Tình trạng**: ⏳ **Ticket & Live Chat Module hoàn thành 100% (Backend + Integration Tests + Frontend `/staff/support` + Build verified)**.
  - *Lưu ý phán quyết scope*: 2 nghiệp vụ CSKH còn lại là *"Tra cứu đơn hàng hạn chế"* và *"Gửi voucher tri ân theo hạn mức `staff_support_limits`"* CHƯA thực hiện trong đợt này và sẽ làm ở đợt riêng sau. Module CSKH CHƯA được đánh dấu hoàn thành 100%.
- **Endpoints đã xây dựng & Nối thật**:
  - `GET /api/staff/support/tickets`: Danh sách ticket phân trang, lọc theo `shopId` của CSKH_STAFF, `status`, `priority`, `assignedTo`, `search`. (Bảo vệ 403 với ticket thuộc chi nhánh khác hoặc ticket HQ `shopId = null`).
  - `GET /api/staff/support/tickets/{id}`: Chi tiết ticket kèm toàn bộ lịch sử tin nhắn.
  - `POST /api/staff/support/tickets`: CSKH tạo ticket mới hỗ trợ khách hàng.
  - `PATCH /api/staff/support/tickets/{id}/status`: Cập nhật trạng thái ticket (Áp dụng State Machine ma trận nghiêm ngặt: `OPEN` -> `IN_PROGRESS`/`ESCALATED`/`RESOLVED`/`CLOSED`, `RESOLVED` -> `CLOSED`/`IN_PROGRESS`, `CLOSED` -> `IN_PROGRESS` duy nhất cho `ADMIN`).
  - `POST /api/staff/support/tickets/{id}/messages`: Staff gửi tin nhắn phản hồi (`senderType = STAFF`).
  - `PATCH /api/staff/support/tickets/{id}/assign`: Phân công ticket (`assignedTo` validation cùng chi nhánh 400) hoặc leo thang (`escalatedTo` validation cùng chi nhánh 400).
  - `POST /api/customer/tickets`: Khách hàng tạo ticket mới từ Storefront.
  - `GET /api/customer/tickets/my-tickets`: Khách hàng xem danh sách ticket của chính mình.
  - `GET /api/customer/tickets/{id}`: Khách hàng xem chi tiết hội thoại (Bảo mật IDOR 403 nếu không phải chính chủ).
  - `POST /api/customer/tickets/{id}/messages`: Khách hàng gửi tin nhắn phản hồi (`senderType = CUSTOMER`, kiểm tra IDOR 403 & từ chối 400 nếu ticket đã `CLOSED`).
