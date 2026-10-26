-- Cac cau hinh nay chi duoc trang admin "Thanh toan & van chuyen" doc/ghi, khong noi nao khac dung:
-- checkout luon co COD + chuyen khoan, phi ship luon 0, che do bao tri khong chan gi.
-- Trang da bi go nen xoa luon du lieu de khong ai tuong la chung con tac dung.
DELETE FROM system_settings WHERE setting_key IN (
    'payment_momo_enabled',
    'payment_cod_enabled',
    'payment_vnpay_enabled',
    'shipping_free_threshold',
    'shipping_standard_fee',
    'shipping_express_fee',
    'system_maintenance_mode'
);
