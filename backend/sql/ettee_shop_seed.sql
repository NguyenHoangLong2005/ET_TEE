-- ===== SEED DATA: NHÂN VIÊN KHO, BÁN HÀNG, VẬN CHUYỂN =====
-- Chạy file này sau khi tạo schema để có dữ liệu mẫu cho 3 nhóm nhân viên.
-- Nghi thức: INSERT chỉ thực hiện nếu dữ liệu chưa tồn tại (kiểm tra qua email/phone/slug/code).

DO $$
DECLARE
    v_admin      UUID;
    v_sales      UUID;
    v_warehouse  UUID;
    v_shipper    UUID;
    v_customer1  UUID;
    v_customer2  UUID;
    v_cat1       UUID;
    v_cat2       UUID;
    v_attr_size  UUID;
    v_attr_color UUID;
    v_val_m      UUID;
    v_val_l      UUID;
    v_val_red    UUID;
    v_val_blue   UUID;
    v_prod1      UUID;
    v_prod2      UUID;
    v_var1       UUID;
    v_var2       UUID;
    v_var3       UUID;
    v_var4       UUID;
    v_var5       UUID;
    v_var6       UUID;
    v_loc        UUID;
    v_order1     UUID;
    v_order2     UUID;
    v_ship1      UUID;
    v_ship2      UUID;
    v_receipt    UUID;
    v_exc        UUID;
BEGIN
    -- ===== 1. USERS & ROLES =====
    SELECT id INTO v_admin FROM users WHERE email='admin@ettee.vn';
    IF v_admin IS NULL THEN
        INSERT INTO users(id,email,phone,password_hash,full_name,is_staff,status,created_at,updated_at)
        VALUES(gen_random_uuid(),'admin@ettee.vn','0901111111','admin123','Admin',true,'active',now(),now()) RETURNING id INTO v_admin;
        INSERT INTO user_roles(user_id,role_id,assigned_by,assigned_at)
        SELECT v_admin,r.id,v_admin,now() FROM roles r WHERE r.code='admin';
    END IF;

    SELECT id INTO v_sales FROM users WHERE email='sales@ettee.vn';
    IF v_sales IS NULL THEN
        INSERT INTO users(id,email,phone,password_hash,full_name,is_staff,status,created_at,updated_at)
        VALUES(gen_random_uuid(),'sales@ettee.vn','0902222222','sales123','NV Bán Hàng',true,'active',now(),now()) RETURNING id INTO v_sales;
        INSERT INTO user_roles(user_id,role_id,assigned_by,assigned_at)
        SELECT v_sales,r.id,v_admin,now() FROM roles r WHERE r.code='sales_staff';
        INSERT INTO staff_profile(user_id,employee_code,department,hired_at,is_active)
        VALUES(v_sales,'NV-BH-001','Bán hàng','2024-06-01',true);
    END IF;

    SELECT id INTO v_warehouse FROM users WHERE email='warehouse@ettee.vn';
    IF v_warehouse IS NULL THEN
        INSERT INTO users(id,email,phone,password_hash,full_name,is_staff,status,created_at,updated_at)
        VALUES(gen_random_uuid(),'warehouse@ettee.vn','0903333333','wh123','NV Kho',true,'active',now(),now()) RETURNING id INTO v_warehouse;
        INSERT INTO user_roles(user_id,role_id,assigned_by,assigned_at)
        SELECT v_warehouse,r.id,v_admin,now() FROM roles r WHERE r.code='warehouse_staff';
        INSERT INTO staff_profile(user_id,employee_code,department,hired_at,is_active)
        VALUES(v_warehouse,'NV-KHO-001','Kho','2024-03-15',true);
    END IF;

    SELECT id INTO v_shipper FROM users WHERE email='shipper@ettee.vn';
    IF v_shipper IS NULL THEN
        INSERT INTO users(id,email,phone,password_hash,full_name,is_staff,status,created_at,updated_at)
        VALUES(gen_random_uuid(),'shipper@ettee.vn','0904444444','ship123','NV Vận Chuyển',true,'active',now(),now()) RETURNING id INTO v_shipper;
        INSERT INTO user_roles(user_id,role_id,assigned_by,assigned_at)
        SELECT v_shipper,r.id,v_admin,now() FROM roles r WHERE r.code='shipper_staff';
        INSERT INTO staff_profile(user_id,employee_code,department,hired_at,is_active)
        VALUES(v_shipper,'NV-VC-001','Vận chuyển','2024-05-20',true);
    END IF;

    -- ===== 2. CUSTOMERS =====
    SELECT id INTO v_customer1 FROM customers WHERE phone='0905555551';
    IF v_customer1 IS NULL THEN
        INSERT INTO customers(id,user_id,full_name,email,phone,email_verified_at,phone_verified_at,created_at,updated_at)
        VALUES(gen_random_uuid(),NULL,'Nguyen Van A','a@ettee.vn','0905555551',now(),now(),now(),now()) RETURNING id INTO v_customer1;
    END IF;

    SELECT id INTO v_customer2 FROM customers WHERE phone='0905555552';
    IF v_customer2 IS NULL THEN
        INSERT INTO customers(id,user_id,full_name,email,phone,email_verified_at,phone_verified_at,created_at,updated_at)
        VALUES(gen_random_uuid(),NULL,'Tran Thi B','b@ettee.vn','0905555552',now(),now(),now(),now()) RETURNING id INTO v_customer2;
    END IF;

    -- ===== 3. CATEGORIES =====
    SELECT id INTO v_cat1 FROM categories WHERE slug='ao-thun';
    IF v_cat1 IS NULL THEN
        INSERT INTO categories(id,parent_id,name,slug,description,is_active,sort_order)
        VALUES(gen_random_uuid(),NULL,'Áo thun','ao-thun','Áo thun cotton',true,0) RETURNING id INTO v_cat1;
    END IF;

    SELECT id INTO v_cat2 FROM categories WHERE slug='quan';
    IF v_cat2 IS NULL THEN
        INSERT INTO categories(id,parent_id,name,slug,description,is_active,sort_order)
        VALUES(gen_random_uuid(),NULL,'Quần','quan','Quần jeans',true,1) RETURNING id INTO v_cat2;
    END IF;

    -- ===== 4. ATTRIBUTES =====
    SELECT id INTO v_attr_size FROM attributes WHERE code='size';
    IF v_attr_size IS NULL THEN
        INSERT INTO attributes(id,code,name,data_type,is_variant_defining)
        VALUES(gen_random_uuid(),'size','Kích cỡ','text',true) RETURNING id INTO v_attr_size;
        INSERT INTO attribute_values(id,attribute_id,value,sort_order) VALUES(gen_random_uuid(),v_attr_size,'S',1);
        INSERT INTO attribute_values(id,attribute_id,value,sort_order) VALUES(gen_random_uuid(),v_attr_size,'M',2);
        INSERT INTO attribute_values(id,attribute_id,value,sort_order) VALUES(gen_random_uuid(),v_attr_size,'L',3);
    END IF;

    SELECT id INTO v_attr_color FROM attributes WHERE code='color';
    IF v_attr_color IS NULL THEN
        INSERT INTO attributes(id,code,name,data_type,is_variant_defining)
        VALUES(gen_random_uuid(),'color','Màu sắc','text',true) RETURNING id INTO v_attr_color;
        INSERT INTO attribute_values(id,attribute_id,value,sort_order) VALUES(gen_random_uuid(),v_attr_color,'Đỏ',1);
        INSERT INTO attribute_values(id,attribute_id,value,sort_order) VALUES(gen_random_uuid(),v_attr_color,'Xanh',2);
    END IF;

    SELECT id INTO v_val_m FROM attribute_values WHERE attribute_id=v_attr_size AND value='M';
    SELECT id INTO v_val_l FROM attribute_values WHERE attribute_id=v_attr_size AND value='L';
    SELECT id INTO v_val_red FROM attribute_values WHERE attribute_id=v_attr_color AND value='Đỏ';
    SELECT id INTO v_val_blue FROM attribute_values WHERE attribute_id=v_attr_color AND value='Xanh';

    -- ===== 5. PRODUCTS & VARIANTS =====
    SELECT id INTO v_prod1 FROM products WHERE slug='ao-thun-white';
    IF v_prod1 IS NULL THEN
        INSERT INTO products(id,category_id,name,slug,description,brand,gender_target,base_price,status,is_repeat_purchase,created_by,created_at,updated_at)
        VALUES(gen_random_uuid(),v_cat1,'Áo thun trắng','ao-thun-white','Áo thun cotton trắng',NULL,'unisex',199000,'active',false,v_warehouse,now(),now()) RETURNING id INTO v_prod1;
    END IF;

    SELECT id INTO v_prod2 FROM products WHERE slug='quan-jeans';
    IF v_prod2 IS NULL THEN
        INSERT INTO products(id,category_id,name,slug,description,brand,gender_target,base_price,status,is_repeat_purchase,created_by,created_at,updated_at)
        VALUES(gen_random_uuid(),v_cat2,'Quần jeans','quan-jeans','Quần jeans xanh',NULL,'male',399000,'active',false,v_warehouse,now(),now()) RETURNING id INTO v_prod2;
    END IF;

    SELECT id INTO v_var1 FROM product_variants WHERE sku='ATT-TR-S';
    IF v_var1 IS NULL THEN
        INSERT INTO product_variants(id,product_id,sku,color,size,price,stock)
        VALUES(gen_random_uuid(),v_prod1,'ATT-TR-S','Xanh','S',199000,50) RETURNING id INTO v_var1;
    END IF;
    SELECT id INTO v_var2 FROM product_variants WHERE sku='ATT-TR-M';
    IF v_var2 IS NULL THEN
        INSERT INTO product_variants(id,product_id,sku,color,size,price,stock)
        VALUES(gen_random_uuid(),v_prod1,'ATT-TR-M','Xanh','M',199000,40) RETURNING id INTO v_var2;
    END IF;
    SELECT id INTO v_var3 FROM product_variants WHERE sku='ATT-TR-L';
    IF v_var3 IS NULL THEN
        INSERT INTO product_variants(id,product_id,sku,color,size,price,stock)
        VALUES(gen_random_uuid(),v_prod1,'ATT-TR-L','Đỏ','L',199000,30) RETURNING id INTO v_var3;
    END IF;
    SELECT id INTO v_var4 FROM product_variants WHERE sku='QJ-B-S';
    IF v_var4 IS NULL THEN
        INSERT INTO product_variants(id,product_id,sku,color,size,price,stock)
        VALUES(gen_random_uuid(),v_prod2,'QJ-B-S','Xanh','S',399000,20) RETURNING id INTO v_var4;
    END IF;
    SELECT id INTO v_var5 FROM product_variants WHERE sku='QJ-B-M';
    IF v_var5 IS NULL THEN
        INSERT INTO product_variants(id,product_id,sku,color,size,price,stock)
        VALUES(gen_random_uuid(),v_prod2,'QJ-B-M','Xanh','M',399000,25) RETURNING id INTO v_var5;
    END IF;
    SELECT id INTO v_var6 FROM product_variants WHERE sku='QJ-TR-M';
    IF v_var6 IS NULL THEN
        INSERT INTO product_variants(id,product_id,sku,color,size,price,stock)
        VALUES(gen_random_uuid(),v_prod2,'QJ-TR-M','Đỏ','M',399000,15) RETURNING id INTO v_var6;
    END IF;

    -- ===== 6. STOCK LOCATIONS =====
    SELECT id INTO v_loc FROM stock_locations WHERE code='MAIN';
    IF v_loc IS NULL THEN
        INSERT INTO stock_locations(id,code,name,is_sellable,is_active)
        VALUES(gen_random_uuid(),'MAIN','Kho chính',true,true) RETURNING id INTO v_loc;
    END IF;

    -- ===== 7. INVENTORY =====
    PERFORM * FROM inventory WHERE variant_id=v_var1 AND location_id=v_loc;
    IF NOT FOUND THEN INSERT INTO inventory(variant_id,location_id,quantity_on_hand,quantity_reserved,reorder_level,updated_at) VALUES(v_var1,v_loc,50,0,10,now()); END IF;
    PERFORM * FROM inventory WHERE variant_id=v_var2 AND location_id=v_loc;
    IF NOT FOUND THEN INSERT INTO inventory(variant_id,location_id,quantity_on_hand,quantity_reserved,reorder_level,updated_at) VALUES(v_var2,v_loc,40,0,10,now()); END IF;
    PERFORM * FROM inventory WHERE variant_id=v_var3 AND location_id=v_loc;
    IF NOT FOUND THEN INSERT INTO inventory(variant_id,location_id,quantity_on_hand,quantity_reserved,reorder_level,updated_at) VALUES(v_var3,v_loc,30,0,10,now()); END IF;
    PERFORM * FROM inventory WHERE variant_id=v_var4 AND location_id=v_loc;
    IF NOT FOUND THEN INSERT INTO inventory(variant_id,location_id,quantity_on_hand,quantity_reserved,reorder_level,updated_at) VALUES(v_var4,v_loc,20,0,5,now()); END IF;
    PERFORM * FROM inventory WHERE variant_id=v_var5 AND location_id=v_loc;
    IF NOT FOUND THEN INSERT INTO inventory(variant_id,location_id,quantity_on_hand,quantity_reserved,reorder_level,updated_at) VALUES(v_var5,v_loc,25,0,5,now()); END IF;
    PERFORM * FROM inventory WHERE variant_id=v_var6 AND location_id=v_loc;
    IF NOT FOUND THEN INSERT INTO inventory(variant_id,location_id,quantity_on_hand,quantity_reserved,reorder_level,updated_at) VALUES(v_var6,v_loc,15,0,5,now()); END IF;

    -- ===== 8. STOCK MOVEMENTS =====
    INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reserved_delta,reference_type,reference_id,idempotency_key,created_by,note) VALUES(v_var1,v_loc,'inbound',50,0,'initial',gen_random_uuid(),'init:v1',v_warehouse,'Nhập ban đầu');
    INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reserved_delta,reference_type,reference_id,idempotency_key,created_by,note) VALUES(v_var2,v_loc,'inbound',40,0,'initial',gen_random_uuid(),'init:v2',v_warehouse,'Nhập ban đầu');
    INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reserved_delta,reference_type,reference_id,idempotency_key,created_by,note) VALUES(v_var3,v_loc,'inbound',30,0,'initial',gen_random_uuid(),'init:v3',v_warehouse,'Nhập ban đầu');
    INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reserved_delta,reference_type,reference_id,idempotency_key,created_by,note) VALUES(v_var4,v_loc,'inbound',20,0,'initial',gen_random_uuid(),'init:v4',v_warehouse,'Nhập ban đầu');
    INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reserved_delta,reference_type,reference_id,idempotency_key,created_by,note) VALUES(v_var5,v_loc,'inbound',25,0,'initial',gen_random_uuid(),'init:v5',v_warehouse,'Nhập ban đầu');
    INSERT INTO stock_movements(variant_id,location_id,movement_type,on_hand_delta,reserved_delta,reference_type,reference_id,idempotency_key,created_by,note) VALUES(v_var6,v_loc,'inbound',15,0,'initial',gen_random_uuid(),'init:v6',v_warehouse,'Nhập ban đầu');

    -- ===== 9. ORDERS =====
    SELECT id INTO v_order1 FROM orders WHERE order_code='DH-001';
    IF v_order1 IS NULL THEN
        INSERT INTO orders(id,order_code,customer_id,customer_name,customer_phone,customer_email,shipping_address,source_platform,checkout_key,status,payment_method,payment_status,currency,subtotal,discount_total,shipping_fee,shipping_discount,total,version,placed_at,submitted_at,confirmed_at,updated_at,created_at)
        VALUES(gen_random_uuid(),'DH-001',v_customer1,'Nguyen Van A','0905555551','a@ettee.vn','{"province":"TP.HCM","district":"Quan 1","ward":"Phu Nhuan","street_address":"123 Duong Ba"}','web',gen_random_uuid(),'confirmed','cod','unpaid','VND',597000,0,30000,0,627000,0,now()-interval '2 days',now()-interval '2 days',now()-interval '1 day',now(),now()) RETURNING id INTO v_order1;
        INSERT INTO order_status_history(id,order_id,from_status,status,order_version,changed_by,note,changed_at) VALUES(gen_random_uuid(),v_order1,'draft','draft',1,v_admin,'Tạo đơn',now());
        INSERT INTO order_status_history(id,order_id,from_status,status,order_version,changed_by,note,changed_at) VALUES(gen_random_uuid(),v_order1,'draft','confirmed',2,v_sales,'Xác nhận đơn',now());
    END IF;

    SELECT id INTO v_order2 FROM orders WHERE order_code='DH-002';
    IF v_order2 IS NULL THEN
        INSERT INTO orders(id,order_code,customer_id,customer_name,customer_phone,customer_email,shipping_address,source_platform,checkout_key,status,payment_method,payment_status,currency,subtotal,discount_total,shipping_fee,shipping_discount,total,version,placed_at,submitted_at,confirmed_at,updated_at,created_at)
        VALUES(gen_random_uuid(),'DH-002',v_customer2,'Tran Thi B','0905555552','b@ettee.vn','{"province":"Ha Noi","district":"Ba Dinh","ward":"Phuc Xa","street_address":"456 Pho"}','app',gen_random_uuid(),'picking','cod','unpaid','VND',897000,0,40000,0,937000,0,now()-interval '1 day',now()-interval '1 day',now(),now(),now()) RETURNING id INTO v_order2;
        INSERT INTO order_status_history(id,order_id,from_status,status,order_version,changed_by,note,changed_at) VALUES(gen_random_uuid(),v_order2,'draft','draft',1,v_admin,'Tạo đơn',now());
        INSERT INTO order_status_history(id,order_id,from_status,status,order_version,changed_by,note,changed_at) VALUES(gen_random_uuid(),v_order2,'draft','pending_confirmation',2,v_admin,'Chờ xác nhận',now());
        INSERT INTO order_status_history(id,order_id,from_status,status,order_version,changed_by,note,changed_at) VALUES(gen_random_uuid(),v_order2,'pending_confirmation','confirmed',3,v_admin,'Xác nhận',now());
        INSERT INTO order_status_history(id,order_id,from_status,status,order_version,changed_by,note,changed_at) VALUES(gen_random_uuid(),v_order2,'confirmed','picking',4,v_warehouse,'Bắt đầu lấy hàng',now());
    END IF;

    -- ===== 10. ORDER ITEMS =====
    SELECT id INTO v_oi1 FROM order_items WHERE order_id=v_order1 AND variant_id=v_var1;
    IF v_oi1 IS NULL THEN
        INSERT INTO order_items(id,order_id,variant_id,product_name_snapshot,sku_snapshot,variant_snapshot,unit_price,quantity,discount_amount,created_at) VALUES(gen_random_uuid(),v_order1,v_var1,'Áo thun trắng','ATT-TR-S','{"size":"S","color":"Xanh"}',199000,2,0,now());
        INSERT INTO order_items(id,order_id,variant_id,product_name_snapshot,sku_snapshot,variant_snapshot,unit_price,quantity,discount_amount,created_at) VALUES(gen_random_uuid(),v_order1,v_var3,'Áo thun đỏ','ATT-TR-L','{"size":"L","color":"Đỏ"}',199000,1,0,now());
    END IF;
    SELECT id INTO v_oi2 FROM order_items WHERE order_id=v_order2 AND variant_id=v_var4;
    IF v_oi2 IS NULL THEN
        INSERT INTO order_items(id,order_id,variant_id,product_name_snapshot,sku_snapshot,variant_snapshot,unit_price,quantity,discount_amount,created_at) VALUES(gen_random_uuid(),v_order2,v_var4,'Quần jeans xanh','QJ-B-S','{"size":"S","color":"Xanh"}',399000,2,0,now());
        INSERT INTO order_items(id,order_id,variant_id,product_name_snapshot,sku_snapshot,variant_snapshot,unit_price,quantity,discount_amount,created_at) VALUES(gen_random_uuid(),v_order2,v_var5,'Quần jeans xanh','QJ-B-M','{"size":"M","color":"Xanh"}',399000,1,0,now());
    END IF;

    -- ===== 11. PAYMENTS =====
    INSERT INTO payments(id,order_id,method,provider,provider_account,amount,currency,status,idempotency_key,transaction_ref,paid_at,created_at,updated_at) VALUES(gen_random_uuid(),v_order1,'cod','cod','default',627000,'VND','pending',gen_random_uuid()::TEXT,NULL,now(),now(),now()) ON CONFLICT DO NOTHING;
    INSERT INTO payments(id,order_id,method,provider,provider_account,amount,currency,status,idempotency_key,transaction_ref,paid_at,created_at,updated_at) VALUES(gen_random_uuid(),v_order2,'cod','cod','default',937000,'VND','pending',gen_random_uuid()::TEXT,NULL,now(),now(),now()) ON CONFLICT DO NOTHING;

    -- ===== 12. SHIPMENTS =====
    SELECT id INTO v_ship1 FROM shipments WHERE order_id=v_order1;
    IF v_ship1 IS NULL THEN
        INSERT INTO shipments(id,order_id,carrier,tracking_code,status,assigned_to,packed_by,packed_at,handed_over_at,cod_amount,delivery_proof_url,created_at,updated_at,version)
        VALUES(gen_random_uuid(),v_order1,'GHN','GHN-001-001','handed_over',v_shipper,v_warehouse,now()-interval '6 hours',now()-interval '1 hour',627000,NULL,now(),now(),0) RETURNING id INTO v_ship1;
    END IF;
    SELECT id INTO v_ship2 FROM shipments WHERE order_id=v_order2;
    IF v_ship2 IS NULL THEN
        INSERT INTO shipments(id,order_id,carrier,tracking_code,status,assigned_to,packed_by,packed_at,handed_over_at,cod_amount,delivery_proof_url,created_at,updated_at,version)
        VALUES(gen_random_uuid(),v_order2,'NINJAVAN','NV-002-001','in_transit',v_shipper,v_warehouse,now()-interval '3 hours',now(),937000,NULL,now(),now(),0) RETURNING id INTO v_ship2;
    END IF;

    -- ===== 13. SHIPPING EXCEPTIONS =====
    SELECT id INTO v_exc FROM shipping_exceptions WHERE shipment_id=v_ship2;
    IF v_exc IS NULL THEN
        INSERT INTO shipping_exceptions(id,shipment_id,exception_type,description,resolution_note,status,created_at)
        VALUES(gen_random_uuid(),v_ship2,'delay','Giao hàng chậm do thời tiết','Đang chờ cập nhật từ hãng','OPEN',now());
    END IF;

    -- ===== 14. STOCK RECEIPTS =====
    SELECT id INTO v_receipt FROM stock_receipts WHERE receipt_code='NH-001';
    IF v_receipt IS NULL THEN
        INSERT INTO stock_receipts(id,receipt_code,supplier_name,status,created_by,created_at)
        VALUES(gen_random_uuid(),'NH-001','Nhap Kho VN','posted',v_warehouse,now()-interval '1 day') RETURNING id INTO v_receipt;
        INSERT INTO stock_receipt_items(id,receipt_id,variant_id,location_id,quantity,unit_cost,movement_id) VALUES(gen_random_uuid(),v_receipt,v_var1,v_loc,20,150000,NULL);
        INSERT INTO stock_receipt_items(id,receipt_id,variant_id,location_id,quantity,unit_cost,movement_id) VALUES(gen_random_uuid(),v_receipt,v_var4,v_loc,10,250000,NULL);
    END IF;

END $$;
