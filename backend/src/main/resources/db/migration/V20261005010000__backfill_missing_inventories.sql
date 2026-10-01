-- San pham tao tu form cua chu cua hang chi co ton o product_variants, khong co dong inventories.
-- Xac nhan don (SalesOrderService.validateInventoryForConfirmation) doi dong inventories, nen moi don
-- cua cac san pham nay deu bi chan. Tao dong con thieu, ton kho = tong ton cac bien the.
INSERT INTO inventories (product_id, product_name, quantity_on_hand, quantity_reserved, reorder_level, shop_id)
SELECT p.id,
       LEFT(p.name, 200),
       COALESCE((SELECT SUM(v.stock) FROM product_variants v WHERE v.product_id = p.id), 0),
       0,
       10,
       1
FROM products p
WHERE p.status <> 'DELETED'
  AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.product_id = p.id);
