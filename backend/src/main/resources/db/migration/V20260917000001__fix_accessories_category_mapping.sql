-- Migration to fix miscategorized accessories products
-- Clothing items (shorts, pants, outerwear, tshirts) that were mistakenly assigned to category 'accessories'
-- are reassigned to their respective target_group categories (men, women, kids).
-- Actual accessory items (Khăn, Tất) with product_type='accessories' are assigned to category 'accessories'.


UPDATE products p
JOIN categories c_new ON c_new.name = 'accessories'
SET p.category_id = c_new.id
WHERE p.slug = 'khan-a-nang-chong-nang-unisex-nguoi-lon-anti-uv-cooling-sb228';

UPDATE products p
JOIN categories c_new ON c_new.name = 'accessories'
SET p.category_id = c_new.id
WHERE p.slug = 'khan-a-nang-chong-nang-unisex-nguoi-lon-anti-uv-cooling-sk010';

UPDATE products p
JOIN categories c_new ON c_new.name = 'accessories'
SET p.category_id = c_new.id
WHERE p.slug = 'khan-a-nang-chong-nang-unisex-nguoi-lon-anti-uv-cooling-sb001';

UPDATE products p
JOIN categories c_new ON c_new.name = 'accessories'
SET p.category_id = c_new.id
WHERE p.slug = 'khan-a-nang-chong-nang-unisex-nguoi-lon-anti-uv-cooling-sa991';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'men'
SET p.category_id = c_new.id
WHERE p.slug = 'quan-sooc-nam-tui-hop-dang-suong-sk010';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'men'
SET p.category_id = c_new.id
WHERE p.slug = 'quan-sooc-nam-tui-hop-dang-suong-se409';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'men'
SET p.category_id = c_new.id
WHERE p.slug = 'ao-khoac-ni-nam-co-mu-cotton-usa-sa010';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'women'
SET p.category_id = c_new.id
WHERE p.slug = 'quan-dai-nu-tui-hop-dang-suong-sg646';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'kids'
SET p.category_id = c_new.id
WHERE p.slug = 'quan-gio-be-gai-parachute-tui-hop-sm200';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'kids'
SET p.category_id = c_new.id
WHERE p.slug = 'quan-gio-be-gai-parachute-tui-hop-sx002';

UPDATE products p
JOIN categories c_new ON c_new.name = 'accessories'
SET p.category_id = c_new.id
WHERE p.slug = 'combo-5-oi-tat-unisex-tre-em-fa159';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'kids'
SET p.category_id = c_new.id
WHERE p.slug = 'ao-phong-be-trai-dang-rong-tui-co-khoa-keo-fk135';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'kids'
SET p.category_id = c_new.id
WHERE p.slug = 'ao-phong-be-trai-dang-rong-tui-co-khoa-keo-fa155';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'kids'
SET p.category_id = c_new.id
WHERE p.slug = 'ao-phong-be-trai-dang-rong-tui-co-khoa-keo-fw332';

UPDATE products p
JOIN categories c_old ON p.category_id = c_old.id AND c_old.name = 'accessories'
JOIN categories c_new ON c_new.name = 'kids'
SET p.category_id = c_new.id
WHERE p.slug = 'quan-jeans-be-trai-cotton-tui-hop-dang-suong-sj963';
