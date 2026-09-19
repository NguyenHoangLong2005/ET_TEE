-- Thêm cột color_code, color_hex vào product_images
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS color_code VARCHAR(30);
ALTER TABLE product_images ADD COLUMN IF NOT EXISTS color_hex VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_product_images_color ON product_images(product_id, color_code);

-- Thêm cột color_code vào product_variants
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS color_code VARCHAR(30);

-- Migrate dữ liệu product_images dựa trên URL suffix
UPDATE product_images
SET color_code = CASE
  WHEN image_url ~ '-sw[0-9]+' THEN 'white'
  WHEN image_url ~ '-sb[0-9]+' THEN 'black'
  WHEN image_url ~ '-sk[0-9]+' THEN 'gray'
  WHEN image_url ~ '-sa[0-9]*' THEN 'beige'
  WHEN image_url ~ '-sl[0-9]*' THEN 'cream'
  WHEN image_url ~ '-se[0-9]*' THEN 'earth'
  WHEN image_url ~ '-sg[0-9]*' THEN 'graygreen'
  WHEN image_url ~ '-sy[0-9]*' THEN 'yellow'
  ELSE NULL
END,
color_hex = CASE
  WHEN image_url ~ '-sw[0-9]+' THEN '#FFFFFF'
  WHEN image_url ~ '-sb[0-9]+' THEN '#111111'
  WHEN image_url ~ '-sk[0-9]+' THEN '#9CA3AF'
  WHEN image_url ~ '-sa[0-9]*' THEN '#D6C3A5'
  WHEN image_url ~ '-sl[0-9]*' THEN '#F3E5AB'
  WHEN image_url ~ '-se[0-9]*' THEN '#8B5A2B'
  WHEN image_url ~ '-sg[0-9]*' THEN '#5F7A61'
  WHEN image_url ~ '-sy[0-9]*' THEN '#FACC15'
  ELSE NULL
END
WHERE image_url ~ '-(sw|sb|sk|sa|sl|se|sg|sy)[0-9]*\.webp';

-- Khớp product_variants.color_code từ color_hex hiện có
UPDATE product_variants
SET color_code = CASE
  WHEN color_hex = '#ffffff' OR color_hex = '#FFFFFF' THEN 'white'
  WHEN color_hex = '#111111' OR color_hex = '#000000' THEN 'black'
  WHEN color_hex = '#9ca3af' THEN 'gray'
  WHEN color_hex = '#d6c3a5' THEN 'beige'
  WHEN color_hex = '#facc15' THEN 'yellow'
  WHEN color_hex = '#dc2626' THEN 'red'
  WHEN color_hex = '#2563eb' THEN 'blue'
  WHEN color_hex = '#0f172a' THEN 'navy'
  WHEN color_hex = '#3b5f8a' THEN 'denim'
  WHEN color_hex = '#f9a8d4' THEN 'pink'
  WHEN color_hex = '#16a34a' THEN 'green'
  ELSE NULL
END
WHERE color_hex IS NOT NULL;
