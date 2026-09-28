# Flyway — quản lý schema database

## 🚨 QUY TẮC SỐ 1: version phải lớn hơn `20260908000000`

Database thật đã được đánh dấu baseline tại version **`20260908000000`**. Flyway
**bỏ qua không thi hành** mọi migration có version nhỏ hơn hoặc bằng mốc này.

Nghĩa là nếu anh đặt tên file `V2__them_bang_shops.sql`, nó sẽ chạy ngon lành trên
máy dev (database rỗng) rồi **im lặng không làm gì trên production** — không báo lỗi,
không cảnh báo. Đây là kiểu hỏng nguy hiểm nhất vì nó trông như đã thành công.

**Luôn đặt tên theo timestamp:**

```
V2026MMDDHHmmss__mo_ta_ngan.sql
```

Ví dụ hợp lệ: `V20260929143000__them_bang_shops.sql`

Ngoại lệ duy nhất là `V1__baseline.sql` — nó *cố ý* nằm dưới mốc baseline để không
bao giờ chạm vào production (xem phần dưới).

Kiểm tra nhanh trước khi commit một migration mới:

```bash
ls backend/src/main/resources/db/migration/
# Moi file (tru V1__baseline.sql) phai bat dau bang V2026... va lon hon V20260908000000
```

## Vì sao có tài liệu này

Trước thay đổi này, dự án **không hề có Flyway trong `pom.xml`**. 21 file trong
`backend/src/main/resources/db/migration/` chưa bao giờ được thi hành. Schema thật
do `spring.jpa.hibernate.ddl-auto=update` dựng dần qua từng lần chạy app.

Trạng thái `flyway_schema_history` trên DB thật (đọc ngày 2026-09-28):

| rank | version        | description           | type     | installed_on |
|------|----------------|-----------------------|----------|--------------|
| 1    | 20260908000000 | << Flyway Baseline >> | BASELINE | 2026-09-08   |

Tức là ai đó đã baseline DB ở version `20260908000000` rồi dừng. **20 file có
version cao hơn chưa từng chạy.** Nếu bật Flyway mà vẫn để chúng trong
`db/migration/`, lần `migrate` đầu tiên sẽ chạy hết 20 file đó lên DB production.

## Đã thay đổi những gì

| Thay đổi | Vị trí |
|---|---|
| Thêm `flyway-core` + `flyway-database-postgresql` | `backend/pom.xml` |
| 21 file migration cũ chuyển sang thư mục lưu trữ | `db/legacy-migration/` |
| Baseline mới sinh từ schema thật (55 bảng, 7 sequence) | `db/migration/V1__baseline.sql` |
| `ddl-auto` đổi `update` → `validate` | `application.properties` |
| Bật Flyway, `baseline-on-migrate=true`, `baseline-version=1` | `application.properties` |
| Tắt Flyway trong profile test | `src/test/resources/application-test.yml` |
| Thêm `@ActiveProfiles("test")` (test này đang nối vào DB thật) | `FashionBackendApplicationTests.java` |

## Vì sao baseline đặt tên `V1` mà không phải version mới

`V1` **thấp hơn** version baseline đang ghi trong DB (`20260908000000`), nên Flyway
bỏ qua nó trên database hiện tại — không một câu DDL nào được thi hành lên production.
File này chỉ dùng để dựng lại schema từ đầu trên một database rỗng (dev/staging mới).

Nếu đặt version cao hơn baseline, Flyway sẽ **chạy nó lên DB thật** và toàn bộ
`CREATE TABLE` sẽ đụng các bảng đang có.

## ⚠️ Connection pooler — phải đọc trước khi chạy migrate

`DB_URL` đang trỏ tới **Supabase transaction pooler, cổng 6543**. Flyway cần
advisory lock ở mức *session*, mà transaction pooling không giữ session cố định
giữa các câu lệnh → migrate có thể treo hoặc lỗi lock.

Trước khi chạy migration, thêm vào `backend/.env` một URL nối **trực tiếp**:

```
DB_MIGRATION_URL=jdbc:postgresql://db.<project-ref>.supabase.co:5432/postgres?sslmode=require
```

Lấy chuỗi này ở Supabase Dashboard → Project Settings → Database → Connection string
→ chọn **Direct connection** (hoặc **Session pooler**, cổng 5432 — cũng được).
`<project-ref>` chính là phần sau dấu chấm trong `DB_USERNAME` hiện tại của anh.

`application.properties` đã khai báo `spring.flyway.url=${DB_MIGRATION_URL:${DB_URL}}`,
nên nếu không đặt biến này Flyway sẽ rơi về pooler — hoạt động bình thường được
*lần này* (vì không có migration nào phải chạy), nhưng sẽ rủi ro ở các lần sau.

## Áp dụng lên DB đang chạy

Lần đầu **không có migration nào cần chạy** (V1 bị bỏ qua), nên đây thực chất chỉ là
bước xác nhận cấu hình đúng.

```bash
cd backend && ./mvnw -DskipTests spring-boot:run
```

Trong log tìm dòng:

```
Flyway Community Edition ... by Redgate
Successfully validated 1 migration (execution time ...)
Current version of schema "public": 20260908000000
Schema "public" is up to date. No migration necessary.
```

Sau đó Hibernate chạy `validate`. Đã kiểm chứng ngày 2026-09-28 rằng toàn bộ entity
khớp với schema thật, app khởi động được.

Nếu Flyway báo `Detected applied migration not resolved locally` thì có file migration
cũ vô tình lọt lại vào `db/migration/` — kiểm tra lại thư mục.

## Viết migration mới từ nay

1. Tạo file `db/migration/V<yyyyMMddHHmmss>__mo_ta_ngan.sql`, version phải **lớn hơn
   `20260908000000`**.
2. Không sửa file migration đã chạy (Flyway kiểm checksum sẽ báo lỗi).
3. Không dùng lại `ddl-auto=update` để đổi schema nữa — Hibernate giờ chỉ đối chiếu.
4. Chạy app hoặc `./mvnw flyway:migrate` với `DB_MIGRATION_URL` đã đặt.

## Kiểm chứng `V1__baseline.sql`

Baseline **chưa từng được thi hành ở đâu**: production bỏ qua nó (version dưới mốc
baseline), profile test thì tắt Flyway. Nên tính đúng đắn của nó chưa được chứng minh.

Cách kiểm chứng an toàn — dựng PostgreSQL rỗng bằng Docker rồi chạy migrate từ đầu,
**không đụng gì tới Supabase**:

```bash
bash scripts/verify-baseline.sh
```

Script tự làm: tạo container `postgres:17` (cùng major version với Supabase 17.6) →
chạy `flyway/flyway:10.20.1 migrate` với thư mục `db/migration` mount vào → đếm
bảng/khoá/index dựng được → xoá sạch container.

Đạt yêu cầu khi bước 2 in `Successfully applied 1 migration` và bước 3 báo **55 bảng**.

Cần Docker Desktop đang chạy. Nếu không có Docker, dùng bất kỳ PostgreSQL 17 rỗng nào
rồi chạy tay:

```bash
psql -h <host> -U <user> -d <db_rong> -v ON_ERROR_STOP=1 \
  -f backend/src/main/resources/db/migration/V1__baseline.sql
```

## Test

Profile `test` tắt Flyway và giữ H2 `create-drop`: `V1__baseline.sql` là DDL riêng
của PostgreSQL (`GENERATED AS IDENTITY`, `nextval(...)::regclass`, `character varying`),
viết thêm một bản tương thích H2 sẽ phải lặp lại cho **mọi** migration về sau.

Đánh đổi: test không bắt được lỗi cú pháp trong file migration. Muốn bịt chỗ này thì
dùng Testcontainers với Postgres thật — nhưng đó là thêm thư viện mới, để bàn riêng.
