-- Link products to the manufacturer and supplier chosen from the store owner's
-- "Nhà sản xuất" / "Nhà cung cấp" pages. Both are optional.
ALTER TABLE products
    ADD COLUMN IF NOT EXISTS manufacturer_id BIGINT REFERENCES manufacturers(id),
    ADD COLUMN IF NOT EXISTS supplier_id BIGINT REFERENCES suppliers(id);

CREATE INDEX IF NOT EXISTS idx_products_manufacturer ON products (manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products (supplier_id);

-- Products so far only carried the manufacturer as free text (brand): link the ones
-- whose brand matches exactly one live manufacturer name (case-insensitive).
UPDATE products p
SET manufacturer_id = m.id
FROM (
    SELECT LOWER(name) AS lname, MIN(id) AS id
    FROM manufacturers
    WHERE deleted_at IS NULL
    GROUP BY LOWER(name)
    HAVING COUNT(*) = 1
) m
WHERE p.manufacturer_id IS NULL
  AND p.brand IS NOT NULL
  AND LOWER(p.brand) = m.lname;
