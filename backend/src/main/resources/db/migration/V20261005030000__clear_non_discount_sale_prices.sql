-- sale_price >= price khong phai la giam gia: lam bo loc "Dang giam gia" tra ve ca danh muc va
-- giao dien hien gia gach ngang bang chinh gia ban. Gia khach tra khong doi (van bang price).
UPDATE products SET sale_price = NULL WHERE sale_price IS NOT NULL AND sale_price >= price;
UPDATE product_variants SET sale_price = NULL WHERE sale_price IS NOT NULL AND sale_price >= price;
