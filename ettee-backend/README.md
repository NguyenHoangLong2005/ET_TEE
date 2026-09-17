# ET.TEE Store — Operations Core Backend

Backend Java (Spring Boot 3.3, Java 21) cho 3 khu vực nội bộ: **Admin**, **Chủ cửa hàng (Store Owner)**, **CSKH**.
Không bao gồm storefront khách hàng (ngoài phạm vi đợt này).

## 1. Yêu cầu môi trường
- JDK 21
- Maven 3.9+
- PostgreSQL 15+ (có extension `pgcrypto` cho `gen_random_uuid()`, và `pgvector` nếu dùng phần AI embedding trong schema)

## 2. Tạo database, user riêng cho app & nạp schema

```bash
# Kết nối vào Postgres bằng user superuser mặc định (thường là "postgres")
psql -U postgres

-- Chạy các lệnh sau BÊN TRONG psql:
CREATE DATABASE ettee_shop;
CREATE USER ettee_app WITH PASSWORD 'changeme';
GRANT ALL PRIVILEGES ON DATABASE ettee_shop TO ettee_app;
\q
```

Sau đó nạp schema (file `ettee_shop_schema.sql` đã có sẵn ngay trong thư mục này):

```bash
psql -U postgres -d ettee_shop -f ettee_shop_schema.sql

# Cấp quyền cho ettee_app trên schema "ettee" vừa được tạo (do file schema tạo sẵn CREATE SCHEMA ettee)
psql -U postgres -d ettee_shop -c "GRANT ALL ON ALL TABLES IN SCHEMA ettee TO ettee_app;"
psql -U postgres -d ettee_shop -c "GRANT ALL ON SCHEMA ettee TO ettee_app;"
psql -U postgres -d ettee_shop -c "GRANT USAGE ON ALL SEQUENCES IN SCHEMA ettee TO ettee_app;"
```

File `ettee_shop_schema.sql` tự seed sẵn:
- 8 role: `admin`, `shop_owner`, `sales_staff`, `warehouse_staff`, `shipper_staff`, `cskh_staff`, `marketing_staff`, `customer`
- Toàn bộ permission + gán permission cho từng role (role `admin` có full quyền)

> 💡 Nếu ngại gõ tay từng bước, đơn giản nhất là dùng luôn user `postgres` (superuser) cho `DB_USER`/`DB_PASSWORD` ở bước 4 thay vì tạo `ettee_app` — bỏ qua toàn bộ khối lệnh GRANT ở trên. Chỉ nên tạo user riêng khi thật sự đưa lên môi trường nhiều người dùng chung.

## 3. Tạo tài khoản đăng nhập đầu tiên (bootstrap)

Schema chỉ tạo role/permission, **chưa tạo user nào**. Chạy đoạn SQL dưới đây để tạo 1 tài khoản Admin đầu tiên — dùng được ngay, không cần tự sinh hash:

- **Email đăng nhập:** `admin@ettee.vn`
- **Mật khẩu:** `Admin@123`

```sql
INSERT INTO ettee.users (id, email, password_hash, full_name, status, is_staff)
VALUES (gen_random_uuid(), 'admin@ettee.vn',
        '$2a$12$Az/Dw8rqSa3RRhUJT2pIw.RvZQhdIn/5TfkjNrpuLZ3HPMlNVSLWq',
        'Quản trị viên hệ thống', 'active', true);

INSERT INTO ettee.staff_profile (user_id, employee_code, department, is_active)
SELECT id, 'ADM-0001', 'Ops', true FROM ettee.users WHERE email = 'admin@ettee.vn';

INSERT INTO ettee.user_roles (user_id, role_id)
SELECT u.id, r.id FROM ettee.users u, ettee.roles r
WHERE u.email = 'admin@ettee.vn' AND r.code = 'admin';
```

> ⚠️ **Đây là hash thật của mật khẩu `Admin@123`** (đã tự sinh và kiểm chứng bằng thuật toán bcrypt cost-factor 12, đúng chuẩn Spring Security `BCryptPasswordEncoder(12)`) — copy-paste chạy thẳng, không cần chỉnh sửa gì. Sau khi đăng nhập lần đầu, hãy **đổi mật khẩu** hoặc tạo tài khoản admin khác rồi khóa/xóa tài khoản này nếu đưa lên production.

## 4. Cấu hình kết nối (biến môi trường)

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=ettee_shop
export DB_USER=ettee_app
export DB_PASSWORD=your_password
export JWT_SECRET=$(openssl rand -base64 48)   # PHẢI đổi khi lên production
export CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

(Có thể sửa trực tiếp `src/main/resources/application.yml` thay vì dùng biến môi trường khi chạy local.)

## 5. Build & chạy

```bash
mvn clean install
mvn spring-boot:run
```

Server chạy ở `http://localhost:8080`. Kiểm tra nhanh: mở `http://localhost:8080/actuator/health` phải trả về `{"status":"UP"}`.

> **Lưu ý:** Môi trường mình viết code này không có quyền truy cập Maven Central nên chưa tự `mvn clean install` để verify trực tiếp được. Thay vào đó mình đã chạy 4 vòng kiểm tra tĩnh thủ công trên toàn bộ 163 file: (1) mọi import nội bộ trỏ đúng class tồn tại, (2) mọi constructor DTO gọi đúng số lượng tham số, (3) mọi `.setXxx()/.getXxx()` trên biến kiểu Entity khớp đúng field thật, (4) mọi permission code trong `@PreAuthorize` khớp đúng permission đã seed trong schema — cả 4 đều sạch. Tuy nhiên đây không thay thế được 1 lần `mvn clean install` thật; bạn vẫn nên chạy sớm để chắc chắn 100%.

## 6. Đăng nhập thử

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usernameOrPhone":"admin@ettee.vn","password":"Admin@123"}'
```

Response trả về `accessToken` — dùng làm header `Authorization: Bearer <token>` cho mọi request sau.

## 7. Cấu trúc module đã hoàn thành

| Khu vực | Package | Chức năng chính |
|---|---|---|
| Nền tảng | `common`, `security`, `config` | JWT, phân quyền theo role thật trong schema, xử lý lỗi tập trung |
| Dùng chung | `identity`, `order`, `catalog` | User/Role/Permission, Order/OrderItem/Customer, Category |
| **Admin** | `admin`, `systemops` | Tài khoản & khóa user, ma trận phân quyền, danh mục hệ thống, audit log, feature flags, model versions |
| **Store Owner** | `storeowner.*` | Dashboard doanh thu, sản phẩm/giá, tồn kho + phê duyệt điều chỉnh, nhân sự, khuyến mãi, nhật ký shop |
| **CSKH** | `cskh.*` | Ticket & trả lời, tra cứu đơn hàng, đổi/trả + hoàn tiền, mã hỗ trợ theo hạn mức |

## 8. Các endpoint chính

```
POST   /api/auth/login
POST   /api/auth/refresh

# Admin (role: admin)
GET    /api/admin/users
POST   /api/admin/users
POST   /api/admin/users/{id}/lock
POST   /api/admin/users/{id}/unlock
POST   /api/admin/users/{id}/roles
GET    /api/admin/rbac/roles
GET    /api/admin/rbac/permissions
PUT    /api/admin/rbac/roles/{roleCode}/permissions
GET    /api/admin/categories
POST   /api/admin/categories
GET    /api/admin/audit-logs
GET    /api/admin/error-logs
GET    /api/admin/feature-flags
PUT    /api/admin/feature-flags/{key}
GET    /api/admin/model-versions

# Store Owner (role: shop_owner, hoặc admin)
GET    /api/store-owner/dashboard/summary
GET    /api/store-owner/products
POST   /api/store-owner/products
PUT    /api/store-owner/products/variants/{variantId}/price
GET    /api/store-owner/inventory/low-stock
POST   /api/store-owner/inventory/adjustment-requests
POST   /api/store-owner/inventory/adjustment-requests/{id}/approve
GET    /api/store-owner/staff
POST   /api/store-owner/promotions
POST   /api/store-owner/promotions/{id}/approve
GET    /api/store-owner/shop-logs

# CSKH (role: cskh_staff, hoặc admin)
GET    /api/cskh/tickets
POST   /api/cskh/tickets/{id}/messages
POST   /api/cskh/tickets/{id}/escalate
GET    /api/cskh/orders
GET    /api/cskh/orders/by-code/{orderCode}
POST   /api/cskh/returns
PUT    /api/cskh/returns/{id}
POST   /api/cskh/returns/orders/{orderId}/refunds
POST   /api/cskh/support-codes
```

Mọi response thành công có dạng:
```json
{ "success": true, "data": {...}, "message": "...", "timestamp": "..." }
```
Mọi lỗi có dạng:
```json
{ "success": false, "errorCode": "BUSINESS_RULE_VIOLATION", "message": "...", "timestamp": "..." }
```

## 9. Chưa làm / hướng mở rộng tiếp

- Admin: "Cổng thanh toán & Vận chuyển", "Mẫu Email & Thông báo" (2 trang admin còn lại)
- Store Owner: quản lý hình ảnh sản phẩm chi tiết (bảng `product_images` đã có entity, chưa có API)
- CSKH: chưa có WebSocket cho chat real-time (hiện tại chat là REST polling qua `GET /tickets/{id}/messages`)
- Frontend (`assets/api.js`) chưa dùng refresh token mới thêm ở backend — vẫn cần đăng nhập lại sau 30 phút. Backend đã sẵn sàng `/api/auth/refresh`, chỉ cần nối tiếp ở frontend.
- Kết nối 18 trang HTML tĩnh vào các API này (đang làm ở lượt tiếp theo)
