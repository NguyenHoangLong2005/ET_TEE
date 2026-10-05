-- Staff CSKH reply on a product review. Additive/nullable only: existing
-- reviews are unaffected, no backfill needed.
ALTER TABLE product_reviews
    ADD COLUMN IF NOT EXISTS reply_message TEXT,
    ADD COLUMN IF NOT EXISTS replied_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;
