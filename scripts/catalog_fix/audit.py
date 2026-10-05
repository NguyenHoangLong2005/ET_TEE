"""Read-only health check of the whole catalogue. Every line should read 0 unless noted.

Run: python audit.py
"""
from db import connect

conn = connect()
conn.set_session(readonly=True)
cur = conn.cursor()
A = "p.status = 'ACTIVE'"

CHECKS = [
    ('active products (info)', f"SELECT count(*) FROM products p WHERE {A}"),
    ('  by target group (info)', f"SELECT string_agg(tg || ':' || n, ', ') FROM (SELECT target_group tg, count(*) n FROM products p WHERE {A} GROUP BY 1 ORDER BY 1) x"),
    ('products without variants', f"SELECT count(*) FROM products p WHERE {A} AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)"),
    ('products without images', f"SELECT count(*) FROM products p WHERE {A} AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id)"),
    ('products without exactly 1 primary image', f"SELECT count(*) FROM products p WHERE {A} AND (SELECT count(*) FROM product_images i WHERE i.product_id = p.id AND i.is_primary) <> 1"),
    ('products without inventory row', f"SELECT count(*) FROM products p WHERE {A} AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = p.id)"),
    ('orphan inventory rows', "SELECT count(*) FROM inventories i WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = i.product_id)"),
    ('duplicate SKUs', "SELECT count(*) FROM (SELECT sku FROM product_variants GROUP BY 1 HAVING count(*) > 1) x"),
    ('duplicate active slugs', f"SELECT count(*) FROM (SELECT slug FROM products p WHERE {A} GROUP BY 1 HAVING count(*) > 1) x"),
    ('duplicate active names', f"SELECT count(*) FROM (SELECT lower(name) FROM products p WHERE {A} GROUP BY 1 HAVING count(*) > 1) x"),
    ('duplicate (product, colour, size)', "SELECT count(*) FROM (SELECT product_id, color, size FROM product_variants GROUP BY 1, 2, 3 HAVING count(*) > 1) x"),
    ('variants with size in colour column', "SELECT count(*) FROM product_variants WHERE color = size"),
    ('variants with placeholder colour', "SELECT count(*) FROM product_variants WHERE color IN ('Mặc định', 'Default Title', '')"),
    ('variants with colour but no hex', "SELECT count(*) FROM product_variants WHERE color IS NOT NULL AND (color_hex IS NULL OR color_hex = '')"),
    ('variants with #000000 not named black', "SELECT count(*) FROM product_variants WHERE color_hex = '#000000' AND color NOT ILIKE 'đen%%'"),
    ('products where 2 colours share a hex', "SELECT count(*) FROM (SELECT product_id, color_hex FROM product_variants WHERE color_hex <> '' GROUP BY 1, 2 HAVING count(DISTINCT color) > 1) x"),
    ('colour names with supplier codes', r"SELECT count(*) FROM product_variants WHERE color ~ '\d{3}' OR color ~ '[A-Z]{2}\d{3}'"),
    ('price <= 0 or NULL', f"SELECT count(*) FROM products p WHERE {A} AND (price IS NULL OR price <= 0)"),
    ('sale_price >= price', f"SELECT count(*) FROM products p WHERE {A} AND sale_price >= price"),
    ('is_sale flag wrong', f"SELECT count(*) FROM products p WHERE {A} AND coalesce(is_sale, false) <> (sale_price IS NOT NULL AND sale_price < price)"),
    ('variant sale_price >= price', "SELECT count(*) FROM product_variants WHERE sale_price >= price"),
    ('product price not matching its variants', f"""SELECT count(*) FROM products p JOIN (SELECT product_id, min(price) lp,
        min(coalesce(sale_price, price)) sp FROM product_variants GROUP BY 1) x ON x.product_id = p.id
        WHERE {A} AND (p.price <> x.lp OR coalesce(p.sale_price, p.price) <> x.sp)"""),
    ('rating without reviews', f"SELECT count(*) FROM products p WHERE {A} AND coalesce(average_rating, 0) > 0 AND coalesce(total_reviews, 0) = 0"),
    ('rating not matching reviews', f"""SELECT count(*) FROM products p WHERE {A} AND coalesce(total_reviews, 0) <>
        (SELECT count(*) FROM product_reviews r WHERE r.product_id = p.id)"""),
    ('template descriptions', f"SELECT count(*) FROM products p WHERE {A} AND description ILIKE '%%chất lượng cao.'"),
    ('names with internal codes', rf"""SELECT count(*) FROM products p WHERE {A} AND (name ~ '#Y2010|\mF[1-9]\M|\(\s*[A-Za-z]{{2,4}}\d{{3,5}}'
        OR name ~ '^(CV|Q-)\s' OR name ~ '\s-\s?\d{{2,4}}$')"""),
    ('clothing in accessories group', f"SELECT count(*) FROM products p WHERE {A} AND target_group = 'accessories' AND product_type <> 'accessories'"),
    ('kids without gender', f"SELECT count(*) FROM products p WHERE {A} AND target_group = 'kids' AND coalesce(gender, '') = ''"),
    ('category missing', f"SELECT count(*) FROM products p WHERE {A} AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.id = p.category_id)"),
    ('category not matching group/type', f"""SELECT count(*) FROM products p JOIN categories c ON c.id = p.category_id
        WHERE {A} AND c.slug NOT IN (p.target_group, p.target_group || '-' || p.product_type)"""),
    ('is_new share % (info)', f"SELECT round(100.0 * count(*) FILTER (WHERE is_new) / count(*)) FROM products p WHERE {A}"),
    ('material known % (info)', f"SELECT round(100.0 * count(*) FILTER (WHERE material IS NOT NULL) / count(*)) FROM products p WHERE {A}"),
]

for label, sql in CHECKS:
    cur.execute(sql)
    print(f'{label:45s} {cur.fetchone()[0]}')
conn.close()
