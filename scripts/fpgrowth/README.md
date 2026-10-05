# Sprint 3 — FP-Growth "Thường được mua kèm" (Giỏ hàng + ngăn giỏ sau khi thêm)

Khai phá luật kết hợp trên giỏ đơn hàng (`orders` / `order_items`) bằng FP-Growth (`mlxtend`),
gợi ý món bổ trợ giá vừa phải để tăng giá trị đơn.

## Vì sao luật ở mức NHÓM sản phẩm

| | |
|---|---|
| Đơn hàng | 1.683 (673 đơn có ≥ 2 món) |
| Sản phẩm đã từng bán | ~1.200 / 2.872 |
| Cặp sản phẩm cùng xuất hiện ≥ 2 đơn | **29** |

Luật ở mức từng sản phẩm gần như không có hỗ trợ. Vì vậy item = **nhóm** `target_group:product_type`
(ví dụ `men:pants`); `accessories` / `family` / trống được gộp thành `unisex`. Món cụ thể được chọn
sau khi có nhóm.

## Thuật toán phục vụ (`CartComplementService`, giống `Recommender` trong `mine_rules.py`)

1. Nhóm của giỏ → luật có vế trái ⊆ nhóm giỏ, bỏ nhóm đã có trong giỏ, xếp theo `confidence × lift`.
2. Thiếu chỗ (tối đa 3 nhóm) → **back-off**: nhóm bán chạy nhất **cùng nhóm khách** với giỏ
   (nam / nữ / trẻ em, luôn kèm unisex). Nhãn trên web phân biệt "Hay mua kèm" (luật) và "Bán chạy" (back-off).
3. Trong mỗi nhóm: sản phẩm ACTIVE bán chạy nhất, **không đắt hơn món đắt nhất trong giỏ**; xen kẽ các nhóm.

## Chạy

```bash
pip install mlxtend pandas psycopg2-binary python-dotenv
python scripts/fpgrowth/mine_rules.py --dry-run   # chỉ đánh giá
python scripts/fpgrowth/mine_rules.py             # đánh giá + ghi luật vào association_rules
```

Backend nạp lại luật mỗi 10 phút, không cần khởi động lại. Toàn bộ luật và số liệu: `rules_report.json`.

## Đánh giá (chia theo thời gian: 80% đơn cũ để khai phá, 20% đơn mới để kiểm tra)

Mỗi đơn kiểm tra có ≥ 2 món: ẩn 1 món, gợi ý từ các món còn lại. "Món bổ trợ" = món bị ẩn thuộc nhóm
**khác** mọi món còn lại (bài toán mua kèm thật sự; mua 2 món cùng loại là so sánh / thay thế).

| Nhóm của món bổ trợ nằm trong 3 nhóm đề xuất (209 mẫu) | |
|---|---:|
| 3 nhóm bán chạy nhất toàn shop | 29.2% |
| Chỉ luật FP-Growth (không back-off) | 17.7% |
| Chỉ back-off (nhóm bán chạy cùng nhóm khách) | 36.8% |
| **FP-Growth + back-off (bản phục vụ)** | **38.3%** |
| Giỏ khớp ít nhất 1 luật | 56.0% |

| HR@10 ở mức sản phẩm — món bổ trợ | |
|---|---:|
| Bán chạy toàn shop | 9.6% |
| FP-Growth + back-off, trần giá "vừa phải" (bản phục vụ) | 8.1% |
| FP-Growth + back-off, bỏ trần giá | 10.0% |

### Đọc kết quả cho trung thực

- Luật FP-Growth chỉ cộng **~1.5 điểm** so với back-off thuần; phần lớn giá trị đến từ việc giữ đúng
  nhóm khách của giỏ. Với 1.7k đơn, luật mới phủ được 56% giỏ.
- Trần giá làm HR@10 giảm (8.1% so với 10.0%): đây là đánh đổi có chủ đích (gợi ý món rẻ hơn để
  tăng giá trị đơn), không phải lỗi. Đo tác động lên AOV thật cần A/B test với khách thật.
- **Đơn hàng là dữ liệu mô phỏng.** Bộ sinh dữ liệu tạo giỏ phối đồ theo đồ thị áo → quần → phụ kiện,
  nên các luật tìm được (`men:polo → men:pants`, `women:shirt → women:pants`...) chủ yếu **tìm lại cấu
  trúc đã cài vào dữ liệu**. Điều đó chứng minh pipeline đúng, không phải phát hiện về khách thật.
