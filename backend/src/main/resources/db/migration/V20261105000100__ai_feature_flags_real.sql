-- Co tinh nang AI gio la that (AiFeatureFlags): danh sach co dinh 4 cong tac, moi cong tac duoc
-- chuc nang tuong ung kiem tra truoc khi chay mo hinh. Xoa cac co cu tao tay (khong noi vao dau)
-- va bat san ca bon cong tac.
DELETE FROM feature_flags
WHERE flag_key NOT IN ('ai_for_you', 'ai_outfit', 'ai_cart_complements', 'ai_smart_search');

INSERT INTO feature_flags (flag_key, is_enabled, description, updated_at)
SELECT v.k, TRUE, v.d, CURRENT_TIMESTAMP
FROM (VALUES ('ai_for_you', 'Dành riêng cho bạn (trang chủ)'),
             ('ai_outfit', 'Phối trọn bộ (trang sản phẩm)'),
             ('ai_cart_complements', 'Thường được mua kèm (giỏ hàng)'),
             ('ai_smart_search', 'Tìm kiếm thông minh')) AS v(k, d)
WHERE NOT EXISTS (SELECT 1 FROM feature_flags f WHERE f.flag_key = v.k);

UPDATE feature_flags SET is_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE flag_key IN ('ai_for_you', 'ai_outfit', 'ai_cart_complements', 'ai_smart_search');
