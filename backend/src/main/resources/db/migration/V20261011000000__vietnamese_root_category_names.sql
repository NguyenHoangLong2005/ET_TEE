-- 5 danh muc goc duoc seed voi ten la slug tieng Anh (men, women, kids, family, accessories).
-- San pham gan truc tiep vao danh muc goc nen the san pham, trang chu "Kham pha theo danh muc",
-- gio hang va man nhan vien deu hien "FAMILY", "ACCESSORIES"... tren site tieng Viet.
-- Chi doi ten hien thi; slug giu nguyen vi bo loc, URL va recsys deu dung slug.
-- Chi doi khi ten van dang la slug, de khong ghi de ten nhan vien da sua.
UPDATE categories SET name = 'Nam'       WHERE parent_id IS NULL AND slug = 'men'         AND name = 'men';
UPDATE categories SET name = 'Nữ'        WHERE parent_id IS NULL AND slug = 'women'       AND name = 'women';
UPDATE categories SET name = 'Trẻ em'    WHERE parent_id IS NULL AND slug = 'kids'        AND name = 'kids';
UPDATE categories SET name = 'Gia đình'  WHERE parent_id IS NULL AND slug = 'family'      AND name = 'family';
UPDATE categories SET name = 'Phụ kiện'  WHERE parent_id IS NULL AND slug = 'accessories' AND name = 'accessories';
