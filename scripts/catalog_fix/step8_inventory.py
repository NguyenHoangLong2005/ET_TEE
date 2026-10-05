"""Step 8: create the warehouse-ledger row for every product that has none.

Confirming an order looks the product up in inventories (StockReservationService), so orders
for the imported products were refused with "Không tìm thấy tồn kho". The row mirrors what
StoreOwnerServiceImpl creates for a product made in the UI: on-hand = sum of variant stock,
reserved 0, reorder level 10, flagship shop, main warehouse.

Run: python step8_inventory.py [--dry-run]
"""
import sys

from db import connect, finish

DRY = '--dry-run' in sys.argv
conn = connect()
cur = conn.cursor()

cur.execute("SELECT id FROM shops ORDER BY id LIMIT 1")
shop_id = cur.fetchone()[0]
cur.execute("""INSERT INTO inventories (product_id, product_name, quantity_on_hand, quantity_reserved,
                                        reorder_level, warehouse_location, shop_id)
               SELECT p.id, left(p.name, 200), coalesce(sum(v.stock), 0), 0, 10, 'KHO-MAIN', %s
               FROM products p LEFT JOIN product_variants v ON v.product_id = p.id
               WHERE p.status <> 'DELETED'
                 AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = p.id)
               GROUP BY p.id, p.name""", (shop_id,))
print('inventory rows created:', cur.rowcount)

cur.execute("""SELECT count(*) FROM products p WHERE p.status <> 'DELETED'
               AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = p.id)""")
print('products still without inventory:', cur.fetchone()[0])
cur.execute("SELECT count(*) FROM (SELECT product_id FROM inventories GROUP BY 1 HAVING count(*) > 1) x")
print('products with >1 inventory row:', cur.fetchone()[0])
cur.execute("SELECT count(*) FROM inventories i WHERE NOT EXISTS (SELECT 1 FROM products p WHERE p.id = i.product_id)")
print('orphan inventory rows:', cur.fetchone()[0])
finish(conn, DRY)
