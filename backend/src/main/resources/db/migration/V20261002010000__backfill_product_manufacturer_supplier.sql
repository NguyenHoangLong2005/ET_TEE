-- Assign a manufacturer and a supplier to products that have none yet, so the
-- "Số sản phẩm" columns on the manufacturer / supplier pages reflect real links.
--
-- Rows already linked (by hand or by the earlier brand-name backfill) are never
-- touched. The mapping is by product type, using the partners' stated specialities
-- (matched by name; a partner that was renamed or deleted is simply skipped):
--   manufacturers: knit tees / polos -> Dệt Kim Hà Nội; trousers, shorts, skirts,
--     outerwear -> Sài Gòn Garment; shirts, homewear, sets -> May Đông Đô;
--     accessories -> Thêu Vi Tính & In Hải Phòng.
--   suppliers: outerwear -> YKK (zips); accessories -> Song Toàn (buttons, labels);
--     every other garment -> Vải Sợi Bảo Minh (fabric).
-- Products with an unlisted type are spread over the four manufacturers by id.

-- Manufacturers -------------------------------------------------------------
WITH m AS (
    SELECT
        (SELECT MIN(id) FROM manufacturers WHERE deleted_at IS NULL AND name ILIKE '%Dệt Kim Hà Nội%')       AS knit,
        (SELECT MIN(id) FROM manufacturers WHERE deleted_at IS NULL AND name ILIKE '%Sài Gòn Garment%')      AS saigon,
        (SELECT MIN(id) FROM manufacturers WHERE deleted_at IS NULL AND name ILIKE '%Đông Đô%')              AS dongdo,
        (SELECT MIN(id) FROM manufacturers WHERE deleted_at IS NULL AND name ILIKE '%Hải Phòng%')            AS print
)
UPDATE products p
SET manufacturer_id = CASE
        WHEN LOWER(p.product_type) IN ('tshirt', 'polo')                          THEN m.knit
        WHEN LOWER(p.product_type) IN ('pants', 'shorts', 'skirt', 'outerwear')   THEN m.saigon
        WHEN LOWER(p.product_type) IN ('shirt', 'homewear', 'set')                THEN m.dongdo
        WHEN LOWER(p.product_type) = 'accessories'                                THEN m.print
        ELSE (ARRAY[m.knit, m.saigon, m.dongdo, m.print])[(p.id % 4) + 1]
    END
FROM m
WHERE p.manufacturer_id IS NULL
  AND p.status <> 'DELETED';

-- Suppliers -----------------------------------------------------------------
WITH s AS (
    SELECT
        (SELECT MIN(id) FROM suppliers WHERE deleted_at IS NULL AND name ILIKE '%Bảo Minh%')   AS fabric,
        (SELECT MIN(id) FROM suppliers WHERE deleted_at IS NULL AND name ILIKE '%YKK%')        AS zip,
        (SELECT MIN(id) FROM suppliers WHERE deleted_at IS NULL AND name ILIKE '%Song Toàn%')  AS trims
)
UPDATE products p
SET supplier_id = CASE
        WHEN LOWER(p.product_type) = 'outerwear'   THEN COALESCE(s.zip, s.fabric)
        WHEN LOWER(p.product_type) = 'accessories' THEN COALESCE(s.trims, s.fabric)
        ELSE s.fabric
    END
FROM s
WHERE p.supplier_id IS NULL
  AND p.status <> 'DELETED';
