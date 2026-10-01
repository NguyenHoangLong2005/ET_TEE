-- Fill empty descriptions of the core categories. Only touches rows that have no
-- description yet, so anything edited by hand is left alone.
UPDATE categories SET description = CASE slug
    WHEN 'men'         THEN 'Thời trang nam: áo, quần và trang phục hằng ngày cho nam giới.'
    WHEN 'women'       THEN 'Thời trang nữ: áo, váy, quần và trang phục hằng ngày cho nữ giới.'
    WHEN 'kids'        THEN 'Thời trang trẻ em: quần áo mềm mại, an toàn cho bé trai và bé gái.'
    WHEN 'family'      THEN 'Thời trang gia đình: trang phục đồng bộ cho cả nhà.'
    WHEN 'accessories' THEN 'Phụ kiện thời trang: túi, mũ, thắt lưng và các món phối đồ.'
    WHEN 'men-tshirt'  THEN 'Áo thun nam chất liệu cotton thoáng mát, dễ phối đồ.'
    WHEN 'men-shirt'   THEN 'Áo sơ mi nam lịch sự, phù hợp đi làm và đi chơi.'
END
WHERE deleted_at IS NULL
  AND (description IS NULL OR btrim(description) = '')
  AND slug IN ('men', 'women', 'kids', 'family', 'accessories', 'men-tshirt', 'men-shirt');
