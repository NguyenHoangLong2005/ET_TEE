-- San pham da xoa mem bi @SQLRestriction an khoi JPA; dong gio hang / wishlist con tro toi no
-- lam trang gio hang va wishlist cua khach loi. Tu gio xoa san pham se don cac dong nay
-- (ProductRemovalService); migration nay don phan da ton tai.
DELETE FROM cart_items
WHERE product_variant_id IN (
    SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.status = 'DELETED');

DELETE FROM wishlist_items
WHERE product_id IN (SELECT id FROM products WHERE status = 'DELETED');
