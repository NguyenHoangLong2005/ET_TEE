-- ==================================================
-- Fashion Recommendation System - Initial Seed Data
-- ==================================================

-- 1. Insert Initial Categories
INSERT INTO categories (name, description) VALUES
('Tops & Shirts', 'T-shirts, shirts, polo, and hoodies'),
('Bottoms & Pants', 'Jeans, trousers, shorts, and skirts'),
('Outerwear', 'Jackets, coats, and blazers'),
('Footwear', 'Sneakers, boots, and formal shoes')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Sample User
INSERT INTO users (username, email) VALUES
('demo_user', 'demo@fashionapp.com')
ON CONFLICT (username) DO NOTHING;

-- 3. Insert Sample Products
INSERT INTO products (name, description, brand, price, category_id, gender, material, style) VALUES
('Classic Oversized Cotton T-Shirt', '100% heavy cotton t-shirt with relaxed fit', 'Urban Wear', 29.99, 1, 'UNISEX', 'Cotton', 'Casual'),
('Slim Fit Denim Jeans', 'Premium stretch denim pants in classic blue', 'Denim Co', 59.99, 2, 'MEN', 'Denim', 'Streetwear')
ON CONFLICT DO NOTHING;

-- 4. Insert Sample Product Variants
INSERT INTO product_variants (product_id, sku, color, size, price, stock) VALUES
(1, 'TSHIRT-BLK-M', 'Black', 'M', 29.99, 50),
(1, 'TSHIRT-BLK-L', 'Black', 'L', 29.99, 35),
(2, 'JEANS-BLU-32', 'Blue', '32', 59.99, 20)
ON CONFLICT (sku) DO NOTHING;
