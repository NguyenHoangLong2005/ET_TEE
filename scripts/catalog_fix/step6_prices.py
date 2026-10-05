"""Step 6: make product-level prices agree with the variants that are actually sold.

Listing cards show products.price / sale_price while the cart charges the variant, so a product
showing 229k with no sale while its variants sell at 139k is wrong. For the new products:
- variant sale_price >= price -> NULL (not a sale)
- product.price      = lowest variant list price
- product.sale_price = lowest variant selling price when below product.price, else NULL
- is_sale            = sale_price IS NOT NULL

Run: python step6_prices.py [--dry-run]
"""
import sys

from db import connect, finish, NEW_FILTER

DRY = '--dry-run' in sys.argv
conn = connect()
cur = conn.cursor()
q = lambda sql: (cur.execute(sql), cur.fetchall())[1]

print('before: product/variant price mismatches', q(f"""SELECT count(*) FROM products p
      JOIN (SELECT product_id, min(price) lp, min(coalesce(sale_price, price)) sp FROM product_variants GROUP BY 1) x
        ON x.product_id = p.id
      WHERE p.{NEW_FILTER} AND (p.price <> x.lp OR coalesce(p.sale_price, p.price) <> x.sp)""")[0][0])

cur.execute(f"""UPDATE product_variants v SET sale_price = NULL FROM products p
                WHERE p.id = v.product_id AND p.{NEW_FILTER} AND v.sale_price >= v.price""")
print('variant fake sales cleared:', cur.rowcount)
cur.execute(f"""UPDATE product_variants v SET price = p.price FROM products p
                WHERE p.id = v.product_id AND p.{NEW_FILTER} AND v.price IS NULL""")
cur.execute(f"""UPDATE products p SET price = x.list_price,
                       sale_price = CASE WHEN x.sell_price < x.list_price THEN x.sell_price END,
                       is_sale = x.sell_price < x.list_price, updated_at = NOW()
                FROM (SELECT product_id, min(price) list_price, min(coalesce(sale_price, price)) sell_price
                      FROM product_variants GROUP BY 1) x
                WHERE x.product_id = p.id AND p.{NEW_FILTER}""")
print('products repriced:', cur.rowcount)

print('after: sale >= price', q(f"SELECT count(*) FROM products WHERE {NEW_FILTER} AND sale_price >= price")[0][0],
      '| is_sale mismatch', q(f"""SELECT count(*) FROM products WHERE {NEW_FILTER}
      AND is_sale IS DISTINCT FROM (sale_price IS NOT NULL)""")[0][0],
      '| price above every variant', q(f"""SELECT count(*) FROM products p WHERE p.{NEW_FILTER}
      AND coalesce(p.sale_price, p.price) > (SELECT max(coalesce(sale_price, price)) FROM product_variants
      WHERE product_id = p.id)""")[0][0])
print('discount by brand (avg %, max %):', q(f"""SELECT brand, round(avg(100 - sale_price * 100 / price)),
      max(round(100 - sale_price * 100 / price)), count(*) FILTER (WHERE is_sale), count(*)
      FROM products WHERE {NEW_FILTER} GROUP BY 1"""))
finish(conn, DRY)
