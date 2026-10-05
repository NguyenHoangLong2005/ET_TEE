-- Sprint 3: luat ket hop "thuong duoc mua kem" (FP-Growth tren order_items), khai pha offline boi
-- scripts/fpgrowth/mine_rules.py. Luat o muc NHOM san pham (target_group:product_type), khong o
-- muc tung san pham: 1.7k don / 1.2k san pham da ban qua thua de luat tung mon co y nghia.
-- Backend chi doc (AssociationRuleService), chon san pham cu the trong nhom ve sau.
CREATE TABLE IF NOT EXISTS association_rules (
    id             BIGSERIAL     PRIMARY KEY,
    -- vd {'men:pants'} hoac {'men:pants','men:tshirt'}; sap xep tang dan
    antecedent     TEXT[]        NOT NULL,
    consequent     VARCHAR(40)   NOT NULL,
    support        DOUBLE PRECISION NOT NULL,
    confidence     DOUBLE PRECISION NOT NULL,
    lift           DOUBLE PRECISION NOT NULL,
    model_version  VARCHAR(80)   NOT NULL,
    created_at     TIMESTAMP     NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_association_rules_version ON association_rules (model_version);
