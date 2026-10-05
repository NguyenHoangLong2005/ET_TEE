# Sprint 6 — Gợi ý size (trang sản phẩm, modal "Hướng dẫn chọn size", trang /size-guide)

## Vì sao KHÔNG phải model học máy

Khi làm sprint này (2026-10-04) không có dữ liệu nào để học size:

- `user_measurements`: 0 dòng.
- Size trong đơn hàng mô phỏng do bộ sinh dữ liệu chọn **ngẫu nhiên**, không gắn với vóc dáng.
- Không có dữ liệu đổi trả vì sai size.

Train một model trên dữ liệu đó chỉ học được nhiễu. Vì vậy bản này **đối chiếu số đo với bảng size
shop đã công bố** — minh bạch, giải thích được, đúng với những gì khách đang đọc trên /size-guide.

## Thuật toán (`SizeAdvisorService`, bảng size ở `recsys/SizeCharts.java`)

```
lệch(size) = Σ  trọng_số_m × khoảng cách nằm NGOÀI khoảng của size / thang_m
             m ∈ số đo khách cung cấp (chiều cao, cân nặng, ngực, eo, vai)
```

| Số đo | Thang | Trọng số |
|---|---:|---:|
| Chiều cao | 5 cm | 1 |
| Cân nặng | 5 kg | 1.5 |
| Vòng ngực / vòng eo | 4 cm | 2 |
| Rộng vai | 1.5 cm | 1 |

- Size lệch ít nhất thắng; bằng nhau thì chọn size mà số đo gần giữa khoảng nhất.
- Thích mặc **ôm / rộng**: lùi / tiến một size nếu size đó lệch thêm không quá 1.0.
- Chỉ gợi ý size **còn hàng**; size hợp nhất mà hết hàng thì nói rõ và đưa size gần nhất.
- Độ tin: "Vừa" (mọi số đo nằm trong khoảng), "Gần đúng" (lệch ≤ 1.5), "Ngoài bảng size".
- Bảng: áo nam, quần nam (29–34 ↔ S–3XL), nữ, trẻ em (size = chiều cao; 90 và 160 suy theo cùng quy tắc,
  không có cân nặng). Phụ kiện / giày: không gợi ý.
- Số đo lấy từ hồ sơ tài khoản (`/account/measurements`; hồ sơ CHILD cho đồ trẻ em) hoặc khách nhập
  trong công cụ tính (lưu trên trình duyệt).

Hai công cụ cũ (modal trang sản phẩm và /size-guide) dùng ngưỡng viết cứng **lệch với chính bảng size
đang công bố** (ví dụ ≤ 62 kg là M trong khi bảng ghi M = 55–61 kg). Giờ cả hai gọi chung backend.

## Bước tiếp theo để có model thật

Ghi lại: size được gợi ý, size khách chọn, và đổi trả có lý do "không vừa". Khi đủ dữ liệu, có thể học
độ lệch của từng dòng sản phẩm so với bảng size (sản phẩm "rộng hơn bảng" / "chật hơn bảng").
