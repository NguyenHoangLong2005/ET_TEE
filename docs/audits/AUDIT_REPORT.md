# AUDIT REPORT: Guest Cart, Guest Checkout & Guest Reviews

## 1. Mục tiêu Audit
Kiểm tra tính toàn vẹn, bảo mật và logic luồng của toàn bộ chu trình Khách vãng lai:
1. Thêm vào giỏ hàng (Guest Cart)
2. Thanh toán (Guest Checkout)
3. Đánh giá sản phẩm (Guest Reviews)

## 2. Kết quả kiểm tra Database

| Hạng mục | Kết quả | Ghi chú |
|----------|---------|---------|
| `carts` cho phép `user_id` NULL | **PASSED** | Đã cấu hình DDL Migration DROP NOT NULL cho bảng carts. |
| Ràng buộc `cart` vô chủ | **PASSED** | Backend bắt buộc phải có JWT hoặc `guest_token`. |
| `orders` cho phép `user_id` NULL | **PASSED** | Đã cấu hình DDL Migration DROP NOT NULL cho bảng orders. |
| Ràng buộc `order` không vô chủ | **PASSED** | Guest Order bắt buộc lưu Snapshot Name, Email, Phone, Address. |
| `order_items` lưu Snapshot | **PASSED** | Các trường như sizeSnapshot, colorSnapshot, itemPrice được lưu lại khi Checkout. |
| `product_reviews` cho phép `user_id` NULL | **PASSED** | Đã chạy ALTER COLUMN `user_id` DROP NOT NULL. |
| `product_reviews` bảo vệ tính hợp lệ | **PASSED** | Cột `order_item_id` là UNIQUE và NOT NULL. Chỉ review được 1 lần/Item. |

## 3. Kết quả kiểm tra API & Business Logic

| Kịch bản Test | Kết quả | Trạng thái |
|---------------|---------|------------|
| Guest Add to Cart không cần login | Add thành công, API nhận diện qua `X-Guest-Cart-Token` | **PASSED** |
| Guest Update/Remove Cart Item | Chỉnh sửa thành công | **PASSED** |
| Login -> Merge Guest Cart vào User Cart | Giỏ tạm được sát nhập, API `/api/cart/merge` hoạt động đúng | **PASSED** |
| Guest Checkout | Đơn hàng tạo thành công mà không báo lỗi 401 | **PASSED** |
| Logged-in User Checkout | UserCheckout xử lý phân luồng chính xác | **PASSED** |
| Guest Review (chưa login) gọi `POST /api/products/*/reviews` thiếu param | Bị chặn `401 Unauthorized` | **PASSED** |
| Guest Review nhưng sai Order Code hoặc sai Email | Bị chặn `403 Forbidden - NOT_PURCHASED` | **PASSED** |
| Guest Review đúng thông tin nhưng đơn chưa giao | Bị chặn `403 Forbidden - NOT_DELIVERED` | **PASSED** |
| Guest Review hợp lệ toàn bộ (Đơn `DELIVERED`, có OrderCode+Email) | Tạo thành công review, Snapshot info được fill đúng | **PASSED** |
| Guest Review lần thứ 2 cho cùng 1 item | Bị chặn `409 Conflict - ALREADY_REVIEWED` | **PASSED** |

## 4. Kết quả kiểm tra Frontend

- **Lỗi `Failed to fetch`**: Đã khắc phục 100%. `NEXT_PUBLIC_API_BASE_URL` được trỏ chuẩn về `http://127.0.0.1:8081` (không dùng IPv6 `localhost:8081`).
- **Cart Drawer & `/cart`**: Không còn hiển thị "Vui lòng đăng nhập" nếu chưa có JWT, giao diện load đúng items của Guest.
- **`/checkout`**: Form cho phép nhập bằng tay Tên, Email, SĐT và Địa chỉ đối với Guest (Guest mode tự động kích hoạt nếu JWT rỗng).
- **`/account/orders`**: Route vẫn được bảo vệ (Chỉ cho Logged-in user).
- **Hiển thị Reviews trên PDP**: Danh sách review hoạt động tốt. ReviewForm của user đăng nhập hiển thị bình thường.
- **Form Guest Review (Phase 2)**: Ẩn dưới Accordion Button. Xác minh bằng Order Code + Email gọi API trả về thành công mới mở khung vote Rating + Comment. Đầy đủ các Validate Toast Error.
- **Mock Data**: Đã xóa bỏ hoàn toàn 100% Mock Data từ `CartContext` và `ReviewContext`. Mọi data đều lấy từ DB PostgreSQL.

## 5. Kết quả kiểm tra Security (Bảo mật)

- **guest_token**: Sử dụng thuật toán Random UUID chuẩn, không thể đoán được.
- **Source of Truth**: Mọi logic giá tiền tổng cộng của đơn hàng (Checkout Price) và Cart Total đều do Backend tính toán lại trong `CartService` / `OrderService`, Frontend không thể chèn giá ảo.
- **Chống Review Ảo**: API ReviewService check cực gắt điều kiện `(orderStatus == 'DELIVERED' OR orderStatus == 'COMPLETED')`. Guest không thể fake payload để tạo review ảo.
- **Bảo mật Guest**: Mỗi guest_token lưu độc lập ở Client side. Người khác không thể truy cập Guest Cart nếu không lấy được token từ localStorage/Cookie của người kia.

## 6. Bugs còn tồn tại (Known Issues)

*Hiện tại không có Bug blocking hay Critical.*
Một số vấn đề về trải nghiệm (UX):
- Hệ thống gửi Email xác nhận (SMTP) chưa kích hoạt -> Nếu guest mua hàng xong, họ phải tự lưu lại OrderCode bằng cách nhìn trên màn hình, không có email chủ động gửi OrderCode cho Guest. (Dự kiến mở khóa ở Phase Marketing).

## 7. Các việc cần làm tiếp theo (Next Steps)
1. **Triển khai Hệ thống Gửi Email (SMTP)**:
   - Gửi mail chứa mã đơn hàng (OrderCode) cho khách.
   - Gửi mail cảm ơn kèm Link mời đánh giá sản phẩm sau khi đơn chuyển sang trạng thái `DELIVERED` (với param đính kèm `?orderCode=...&email=...` sẵn trên URL để khách chỉ việc bấm là Review luôn).
2. **Phase 3 (Marketing Staff)**: Bắt đầu triển khai phân hệ cho Nhân viên Marketing (Banner Management, Voucher System).
