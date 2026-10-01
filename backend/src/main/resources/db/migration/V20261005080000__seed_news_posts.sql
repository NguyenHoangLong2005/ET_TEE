-- 4 bai tin tuc khach dang doc truoc day nam cung trong web/src/data/articles.ts, khong co trong DB,
-- nen nhan vien marketing khong thay, khong sua, khong an duoc. Dua vao marketing_posts de quan ly
-- nhu moi bai khac. Bo cac so lieu khong kiem chung ("200+ showroom", "100 lan giat").
-- ON CONFLICT: khong ghi de neu slug da duoc nhan vien tao.
INSERT INTO marketing_posts (title, slug, excerpt, content, cover_image_url, status, author, published_at, views, tags, created_at, updated_at)
VALUES
(
  'Bí quyết chọn áo sơ mi nam phom Slim Fit tôn dáng',
  'bi-quyet-chon-so-mi-nam-phom-slim-fit',
  'Áo sơ mi Slim Fit là món đồ không thể thiếu của phái mạnh. Cách chọn độ rộng vai, chiều dài tay và chất liệu để mặc lên gọn gàng, lịch lãm.',
  $c$Một chiếc sơ mi Slim Fit vừa vặn giúp dáng người trông gọn và cao hơn. Chỉ cần để ý vài điểm dưới đây khi thử áo.

## 1. Đường vai
Đường may vai nên nằm đúng đỉnh xương vai. Vai rơi xuống bắp tay khiến áo trông rộng thùng thình, còn vai quá hẹp sẽ kéo căng phần lưng.

## 2. Thân áo
Khi cài hết cúc, vải ở ngực và bụng không bị kéo thành nếp chữ X. Kẹp được khoảng hai ngón tay giữa áo và người là vừa.

## 3. Chiều dài tay và thân
Tay áo chạm tới cổ tay khi buông thõng. Thân áo dài qua thắt lưng vài phân để sơ vin không bị tuột.

## 4. Chất liệu
Vải cotton có pha một chút sợi co giãn giúp áo ôm dáng mà vẫn thoải mái khi cử động cả ngày.

## Mẹo nhỏ
- Ủi áo khi còn hơi ẩm để vải phẳng nhanh hơn.
- Treo áo bằng móc vai rộng để giữ phom vai.$c$,
  'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop',
  'PUBLISHED', 'Marketing Team', TIMESTAMP '2026-09-18 09:00:00', 0, 'Mẹo phối đồ, Sơ mi nam',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'Xu hướng đồ đôi gia đình thu đông 2026',
  'xu-huong-thoi-trang-gia-dinh-thu-dong-2026',
  'Mặc đồng điệu cùng cả nhà chưa bao giờ dễ đến thế. Gợi ý cách chọn màu và kiểu dáng cho bộ đồ gia đình mùa thu đông.',
  $c$Đồ đôi gia đình không cần giống hệt nhau. Chỉ cần chung một tông màu hoặc một chi tiết là cả nhà đã trông ăn ý.

## 1. Chọn chung một bảng màu
Các tông trầm như be, nâu, xanh rêu, xám rất hợp mùa thu đông và dễ phối cho mọi lứa tuổi.

## 2. Cùng kiểu, khác màu
Bố mẹ và các con mặc cùng một kiểu áo nỉ hoặc áo len nhưng mỗi người một màu trong cùng bảng màu.

## 3. Điểm nhấn chung
Một chiếc khăn, mũ len hay họa tiết nhỏ giống nhau là đủ để tạo sự kết nối trong ảnh gia đình.

## Gợi ý chọn đồ cho bé
- Ưu tiên chất liệu mềm, thoáng, không gây ngứa.
- Chọn áo khoác có khóa kéo để bé dễ tự mặc và cởi.$c$,
  'https://images.unsplash.com/photo-1543269664-76bc3997d9ea?q=80&w=800&auto=format&fit=crop',
  'PUBLISHED', 'Marketing Team', TIMESTAMP '2026-09-15 09:00:00', 0, 'Xu hướng, Gia đình',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'Chất liệu Pima Cotton có gì đặc biệt?',
  'chat-lieu-pima-cotton-co-gi-dac-biet',
  'Pima Cotton được xem là một trong những loại cotton tốt nhất. Tìm hiểu vì sao loại sợi này mềm, bền và thoáng khí.',
  $c$Pima là giống bông có sợi dài hơn cotton thông thường. Chính chiều dài sợi tạo nên những ưu điểm của vải.

## 1. Mềm mịn hơn
Sợi dài cho phép kéo thành sợi vải mảnh và đều, bề mặt vải ít xơ nên chạm vào mịn hơn.

## 2. Bền hơn
Ít đầu sợi hơn nên vải ít bị xù lông và giữ màu tốt hơn sau nhiều lần giặt.

## 3. Thoáng khí
Như mọi loại cotton, Pima thấm hút mồ hôi tốt, phù hợp với áo polo và áo thun mặc hằng ngày.

## Cách giặt đồ Pima Cotton
- Giặt nước lạnh hoặc ấm nhẹ.
- Lộn trái áo trước khi giặt.
- Hạn chế sấy nhiệt cao để vải không co.$c$,
  'https://images.unsplash.com/photo-1576053139778-7e32f2ae3cfd?q=80&w=800&auto=format&fit=crop',
  'PUBLISHED', 'Marketing Team', TIMESTAMP '2026-09-10 09:00:00', 0, 'Chất liệu, Cotton',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
),
(
  'Mẹo giặt và bảo quản áo polo luôn giữ phom',
  'cach-bao-quan-ao-polo-khong-bi-xao-phom',
  'Giặt thế nào để cổ áo polo không bị giãn hay cong vênh? 5 bước bảo quản đơn giản tại nhà.',
  $c$Cổ áo và bo tay là phần dễ hỏng nhất của áo polo. Vài thói quen nhỏ giúp áo bền đẹp lâu hơn.

## 1. Cài cúc và lộn trái trước khi giặt
Cài cúc giúp cổ áo không bị kéo lệch, lộn trái giữ màu mặt ngoài.

## 2. Dùng túi giặt
Cho áo vào túi giặt khi giặt máy để hạn chế cọ xát và vướng vào đồ khác.

## 3. Giặt nước lạnh, chế độ nhẹ
Nước nóng và vắt mạnh là nguyên nhân chính làm cổ áo bị quăn.

## 4. Phơi đúng cách
Vuốt phẳng cổ áo khi còn ướt, phơi trong bóng râm bằng móc vai rộng.

## 5. Ủi nhẹ phần cổ
Ủi cổ áo từ hai đầu vào giữa ở nhiệt độ vừa phải để giữ phom.$c$,
  'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?q=80&w=800&auto=format&fit=crop',
  'PUBLISHED', 'Marketing Team', TIMESTAMP '2026-09-05 09:00:00', 0, 'Bảo quản, Áo polo',
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT (slug) DO NOTHING;
