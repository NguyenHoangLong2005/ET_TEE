# Deploy lên VPS bằng Docker

Stack gồm 4 container trên một VPS, database vẫn ở Supabase:

```
Internet ──443──> caddy ──> web (Next.js :3000) ──127.0.0.1:8081──> backend (Spring Boot) ──> embedder (CLIP :8090)
                                                                          └──> Supabase Postgres
```

Chỉ Caddy mở cổng ra ngoài (80/443) và tự lấy chứng chỉ HTTPS. `web` dùng chung network namespace với
`backend`, vì backend chỉ tin header `X-Forwarded-For` (dùng cho rate limit và IP trong audit log)
khi request đến từ loopback.

## 1. Chuẩn bị

- VPS Ubuntu 22.04/24.04, **tối thiểu 4 GB RAM** (embedder khoảng 1.5 GB, backend khoảng 1 GB). Bản 2 GB
  chỉ đủ nếu tắt embedder, xem mục 5.
- Một tên miền. Tạo bản ghi **A** cho `example.com` và `www.example.com` trỏ về IP của VPS.
- Mở firewall cổng 22, 80, 443.

## 2. Cài Docker trên VPS

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # đăng xuất rồi đăng nhập lại
```

## 3. Lấy code và cấu hình

```bash
git clone <repo-url> fashion && cd fashion/deploy
cp .env.example .env
nano .env
```

Điền `DOMAIN`, `FRONTEND_URL`, thông tin Supabase và SMTP. Tạo `AUTH_SECRET` mới bằng
`openssl rand -base64 48`. Đổi secret thì mọi người dùng phải đăng nhập lại.

Nếu đã có ảnh upload hoặc model retrain trên máy local, chép lên VPS:

```bash
# chạy trên máy local
scp -r backend/models-live/* user@vps:~/fashion/deploy/data/models-live/
```

Ảnh sản phẩm upload nằm trong volume `fashion_uploads`. Để nạp ảnh cũ vào, xem mục 6.

## 4. Chạy

```bash
docker compose up -d --build
docker compose logs -f backend      # chờ dòng "Started ...Application"
```

Lần build đầu mất khoảng 10–20 phút (embedder tải torch và model CLIP). Mở `https://<DOMAIN>` để kiểm tra.

## 5. Vận hành

| Việc | Lệnh |
|---|---|
| Cập nhật code mới | `git pull && docker compose up -d --build` |
| Xem log | `docker compose logs -f web backend` |
| Khởi động lại một service | `docker compose restart backend` |
| Tắt hết | `docker compose down` (volume vẫn giữ nguyên) |
| Dọn image cũ | `docker image prune -f` |

Sau khi `backend` được tạo lại, `web` cũng phải tạo lại theo vì dùng chung network với nó.
`docker compose up -d` tự làm việc này. Nếu chỉ `restart backend` mà web báo lỗi kết nối, chạy
`docker compose up -d --force-recreate web`.

**Chạy không có embedder (VPS 2 GB):** xóa service `embedder` và dòng `depends_on: - embedder` trong
`docker-compose.yml`. Tìm kiếm sẽ tự chuyển về chỉ tìm theo từ khóa, các tính năng khác vẫn chạy bình thường.

**Webhook thanh toán:** nếu dùng SePay hoặc PayOS, đổi webhook URL trong trang quản trị của họ sang
`https://<DOMAIN>/api/...`.

## 6. Sao lưu ảnh upload

```bash
# sao lưu
docker run --rm -v fashion_uploads:/data -v $PWD:/backup alpine tar czf /backup/uploads.tgz -C /data .
# khôi phục (hoặc nạp ảnh từ máy local: nén backend/uploads thành uploads.tgz rồi scp lên)
docker run --rm -v fashion_uploads:/data -v $PWD:/backup alpine tar xzf /backup/uploads.tgz -C /data
```

Database đã được Supabase sao lưu, không cần làm gì thêm ở VPS.
