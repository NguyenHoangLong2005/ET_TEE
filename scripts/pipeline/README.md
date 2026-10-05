# Sprint 7 — Tự động train lại và đưa model lên mà không cần deploy

```
python scripts/pipeline/retrain.py            # SASRec + FP-Growth + Outfit
python scripts/pipeline/retrain.py --only fpgrowth
python scripts/pipeline/retrain.py --dry-run  # train + kiểm tra, không đưa lên
python scripts/pipeline/retrain.py --force    # đưa lên dù không qua cổng chất lượng
```

## Từng bước với mỗi model

| Bước | SASRec | Outfit (CSN) | FP-Growth |
|---|---|---|---|
| Train vào `scripts/pipeline/staging/<lần chạy>/` | `train.py --seeds 1` (~10 phút CPU) | `train_outfit.py` (~5 phút) | `mine_rules` (vài giây) |
| Cổng chất lượng (không kém bản đang chạy quá) | NDCG@10 − 0.005 | MRR − 0.010 | nhóm đúng top-3 − 0.03, phải có ≥ 1 luật |
| Kiểm tra thêm | file ONNX chạy bằng onnxruntime phải cho top-10 **giống hệt** PyTorch | | |
| Đưa lên | chép cả thư mục vào `backend/models-live/<model>/` bằng **một lần đổi tên** | như SASRec | thay luật trong `association_rules` |
| Backend nhận bản mới | `ModelReloader` kiểm tra mỗi 60 giây, đổi nguyên khối; file hỏng thì giữ bản cũ | như SASRec | `CartComplementService` đọc lại mỗi 10 phút |
| Đăng ký | 1 dòng trong `ai_model_versions` (bản mới active, bản cũ cùng tên inactive) — xem ở trang admin "AI config" | | |

Kết quả mỗi lần chạy: `scripts/pipeline/last_run.md` (và `staging/<lần chạy>/report.md`).
Chưa có gì trong `models-live/` thì backend dùng bản đóng gói trong jar (`src/main/resources/models/`).

## Hạn chế cần nói rõ

- Cổng chất lượng so metric test của hai lần chạy trên **hai tập test khác nhau** (dữ liệu đã thêm).
  Nó chặn bản hỏng hoặc tụt rõ, **không thay** được A/B test với khách thật.
- Vector CLIP (Sprint 1) cần GPU nên **không** nằm trong pipeline. Pipeline đếm sản phẩm ACTIVE chưa có
  vector và cảnh bảo; những sản phẩm đó không vào được SASRec / phối đồ cho tới khi chạy lại notebook
  trên Colab (`scripts/embeddings/COLAB_README.md`).
- Dữ liệu hiện tại chủ yếu là mô phỏng; khi có hành vi thật, pipeline học trên cả hai (bộ sinh dữ liệu
  đánh dấu session `syn-%` / đơn `SYN-%` nên có thể lọc riêng sau này).

## Chạy định kỳ (Windows Task Scheduler)

Không tự tạo — đây là cấu hình hệ thống, bạn tự quyết. Ví dụ chạy 2 giờ sáng Chủ nhật hằng tuần:

```bash
schtasks /Create /TN "ETTEE retrain" /SC WEEKLY /D SUN /ST 02:00 /TR "cmd /c cd /d C:\userdata\fashion-recommendation-system && python scripts\pipeline\retrain.py"
```
