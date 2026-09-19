# ET.TEE — Cập nhật điều hướng Staff Portal

Bản cập nhật được làm từ mã nguồn trong ET_TEE(2).rar, không sử dụng các đường dẫn của ví dụ cũ.

## Mở giao diện

- Trang vào Staff: `http://localhost:3000/staff` (tự chuyển đến Dashboard)
- Dashboard chung: `http://localhost:3000/staff/dashboard`
- Bán hàng: `/staff/dashboard/sales`
- Kho: `/staff/dashboard/warehouse`
- Vận chuyển: `/staff/dashboard/shipping`
- Tồn kho: `/staff/dashboard/warehouse/inventory` (đường dẫn cũ `invnentory` được chuyển hướng)

## Những gì đã sửa

1. Thay Dashboard tổng bằng 3 thẻ vai trò và các liên kết đến đúng file `page.tsx` có sẵn. Loại bỏ các thống kê giả (148 đơn, doanh thu 45,8 triệu…).
2. Sửa các `href` sai từ `/staff/{role}` thành `/staff/dashboard/{role}` ở trang Staff; **không** thay đổi API `/api/staff/...`.
3. Tạo đường dẫn tồn kho viết đúng `inventory` và chuyển hướng từ đường dẫn cũ `invnentory`.
4. Trang bán hàng dùng API đơn hàng thay vì thống kê sản phẩm không liên quan; hiển thị dấu gạch ngang nếu không đọc được API.
5. Làm lại trang đầu của cả ba vai trò, dùng API tương ứng để hiển thị số liệu thực; không giả lập số lượng khi backend lỗi.
6. Sửa trang ngoại lệ vận chuyển để lấy URL API từ `NEXT_PUBLIC_API_URL` thay vì cố định localhost, nhận cả mảng trực tiếp và dạng `{data:[...]}` và dùng trường `id` của Entity.

## Cài bản vá lên project đang làm

Giải nén file ZIP **đúng tại** `F:\datn2\ET_TEE` để các file nằm dưới `web/src/app/...`. Sao lưu hoặc commit code trước khi ghi đè. Đừng giải nén thêm một lớp `ET_TEE` vào trong thư mục project. Chỉ file ZIP `ET_TEE_staff_navigation_patch.zip` là cần thiết nếu bạn đã có project đang chạy.

Trong PowerShell:

```powershell
cd F:\datn2\ET_TEE\web
npm install
npm run dev
```

Kiểm tra trang tại `http://localhost:3000/staff/dashboard`. Backend cần chạy riêng ở `http://localhost:8080` để số liệu và hành động có dữ liệu. Dashboard tổng không cần API mới mở được.

**Giới hạn:** Bản vá giao diện/route này không tự thêm phân quyền hay xử lý các lỗi dữ liệu và backend đang tồn tại. Không được coi việc có đường dẫn là đã có bảo vệ quyền truy cập.
