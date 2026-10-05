# Mã giảm giá đến tay khách như thế nào

## Nguyên tắc

- **Khách thuộc về thương hiệu ET.TEE, không thuộc về chi nhánh.** Voucher gửi cho khách luôn là
  voucher toàn hệ thống (`shop_id` NULL). `shop_id` trên voucher chỉ cho biết chi nhánh nào đề xuất /
  duyệt; khi khách dùng mã, hệ thống không xét chi nhánh (mọi đơn online hiện vào chi nhánh 1).
- **Ai nhận email quảng cáo = đã đồng ý + thuộc nhóm phù hợp.** Không ai được đăng ký sẵn.
  Email giao dịch (OTP, xác nhận đơn, trạng thái đơn) không phụ thuộc vào đồng ý.
- Căn cứ: Nghị định 91/2020/NĐ-CP (chống tin nhắn, thư điện tử rác: quảng cáo cần sự đồng ý của người
  nhận, phải có cách từ chối) và Nghị định 13/2023/NĐ-CP (bảo vệ dữ liệu cá nhân: đồng ý rõ ràng,
  rút lại được).

## Khách đồng ý / hủy ở đâu

| Nơi | Ghi nhận |
|---|---|
| Form đăng ký tài khoản | ô tích, **mặc định không tích** (`source = REGISTER`) |
| Trang "Voucher của tôi" (`/account/vouchers`) | công tắc bật / tắt (`ACCOUNT`) |
| Form "Đăng ký nhận bản tin" trang chủ | cả khách chưa có tài khoản (`NEWSLETTER`) |
| Link "Hủy đăng ký" trong **mọi** email quảng cáo + header `List-Unsubscribe` | hủy bằng một lần bấm (`/unsubscribe`) |

Lưu trong `marketing_subscriptions` theo email: trạng thái, nguồn, thời điểm đồng ý / hủy.
`MarketingMailer` kiểm tra lại đồng ý **ngay lúc gửi** — khách hủy sau khi chiến dịch đã lên lịch
vẫn không nhận.

## Ba cách khách biết đến mã

1. **Ngay trên web (không cần email)**
   - Trang thanh toán tự tính các mã dùng được cho giỏ hiện tại, mã có lợi nhất trước, bấm "Áp dụng".
   - "Voucher của tôi": voucher riêng (chào mừng, mời quay lại, bồi thường CSKH) + voucher chung,
     kèm điều kiện (đơn tối thiểu, hạn dùng).
2. **Email tự động theo hành vi của từng khách** (`LifecycleMarketingService`)

   | Khi nào | Khách nhận | Gửi email? |
   |---|---|---|
   | Tài khoản mới xác thực (trong 3 ngày) | voucher riêng giảm 10% (tối đa 50.000đ) cho **đơn đầu tiên**, hạn 30 ngày | chỉ khi đã đồng ý; voucher vẫn vào "Voucher của tôi" |
   | Giỏ hàng để quên 24–72 giờ, chưa đặt đơn | email nhắc giỏ hàng (không kèm mã) | chỉ khi đã đồng ý; tối đa 1 lần / 7 ngày |
   | Đơn gần nhất cách 60–90 ngày | voucher riêng giảm 15% (tối đa 70.000đ), hạn 21 ngày | chỉ khi đã đồng ý; tối đa 1 lần / 90 ngày |

   Voucher riêng chỉ tài khoản đó dùng được (`granted_to_customer_id`), 1 lần. Mức giảm chỉnh trong
   `application.properties` (`app.lifecycle.*`). Mỗi lần phát / gửi ghi vào `marketing_messages`
   để không bao giờ gửi trùng.
3. **Chiến dịch email do marketing tạo** (`/staff/dashboard/marketing/email`)
   - Chọn voucher toàn hệ thống (tùy chọn) + nhóm khách: tất cả người đồng ý / khách mới (chưa mua) /
     khách cũ (đã mua) / hay xem đồ nam - nữ - trẻ em trong 90 ngày (từ dữ liệu hành vi của Sprint 2).
   - Xem trước số người nhận, lưu nháp, gửi (chạy nền, mỗi chiến dịch gửi đúng một lần).
   - Thống kê: đã gửi, lượt mở (ảnh theo dõi — **ước tính**), số đơn người nhận dùng mã sau khi gửi
     và doanh thu (**liên quan, không chứng minh email là nguyên nhân**).

## Kỹ thuật

- Bảng: `marketing_subscriptions`, `email_campaigns`, `marketing_messages`
  (migration `V20261010000000__marketing_email.sql`).
- Tắt toàn bộ email quảng cáo: `app.marketing.email.enabled=false`. Tắt các job tự động:
  `app.lifecycle.enabled=false` (đã tắt trong cấu hình test).
- Test: `MarketingConsentTest`, `CustomerVoucherServiceTest`, `MarketingLifecycleIntegrationTest`.
