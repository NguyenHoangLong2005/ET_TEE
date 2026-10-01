-- Mo ta voucher SUMMER10 bi luu sai encoding ("Gi?m 10% cho don t? 200k"), khach thay dau "?".
UPDATE vouchers
SET description = 'Giảm 10% cho đơn từ 200k'
WHERE code = 'SUMMER10' AND description = 'Gi?m 10% cho don t? 200k';
