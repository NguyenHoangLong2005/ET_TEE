-- Email marketing: dong y nhan email, chien dich, nhat ky tin da gui.
--
-- Khach KHONG gan voi shop: ai nhan email quang cao chi phu thuoc (1) co dong y hay khong va
-- (2) thuoc nhom nao (khach moi / cu / so thich tu hanh vi). Voucher gui cho khach la voucher toan
-- he thong (shop_id NULL).

-- Dong y nhan email quang cao (Nghi dinh 91/2020 ve chong thu rac, Nghi dinh 13/2023 ve du lieu ca
-- nhan): mot dong theo EMAIL, de ca khach chua co tai khoan (form ban tin trang chu) cung dang ky
-- duoc. Email giao dich (OTP, don hang) KHONG phu thuoc bang nay.
CREATE TABLE IF NOT EXISTS marketing_subscriptions (
    id                BIGSERIAL     PRIMARY KEY,
    email             VARCHAR(255)  NOT NULL,
    user_id           VARCHAR(255),
    status            VARCHAR(20)   NOT NULL DEFAULT 'SUBSCRIBED',
    source            VARCHAR(30)   NOT NULL,
    unsubscribe_token VARCHAR(64)   NOT NULL,
    consented_at      TIMESTAMP     NOT NULL DEFAULT now(),
    unsubscribed_at   TIMESTAMP,
    updated_at        TIMESTAMP     NOT NULL DEFAULT now(),
    CONSTRAINT uq_marketing_subscriptions_email UNIQUE (email),
    CONSTRAINT uq_marketing_subscriptions_token UNIQUE (unsubscribe_token),
    CONSTRAINT chk_marketing_subscriptions_status CHECK (status IN ('SUBSCRIBED', 'UNSUBSCRIBED'))
);
CREATE INDEX IF NOT EXISTS idx_marketing_subscriptions_user ON marketing_subscriptions (user_id);

-- Chien dich email do nhan vien marketing tao: 1 voucher (tuy chon) + 1 nhom khach nhan.
CREATE TABLE IF NOT EXISTS email_campaigns (
    id          BIGSERIAL     PRIMARY KEY,
    name        VARCHAR(150)  NOT NULL,
    subject     VARCHAR(200)  NOT NULL,
    intro       VARCHAR(2000),
    voucher_id  BIGINT        REFERENCES vouchers(id) ON DELETE SET NULL,
    segment     VARCHAR(30)   NOT NULL,
    status      VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    recipients  INTEGER       NOT NULL DEFAULT 0,
    created_by  VARCHAR(255),
    created_at  TIMESTAMP     NOT NULL DEFAULT now(),
    sent_at     TIMESTAMP
);

-- Moi tin da gui / voucher da phat (chien dich va tu dong): chong gui trung, do hieu qua.
-- channel WALLET = chi them voucher vao "Voucher cua toi" (khach khong dong y nhan email).
CREATE TABLE IF NOT EXISTS marketing_messages (
    id                    BIGSERIAL    PRIMARY KEY,
    kind                  VARCHAR(30)  NOT NULL,
    channel               VARCHAR(10)  NOT NULL,
    status                VARCHAR(20)  NOT NULL,
    email                 VARCHAR(255),
    user_id               VARCHAR(255),
    campaign_id           BIGINT       REFERENCES email_campaigns(id) ON DELETE SET NULL,
    voucher_id            BIGINT       REFERENCES vouchers(id) ON DELETE SET NULL,
    email_tracking_token  VARCHAR(64),
    created_at            TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketing_messages_user_kind ON marketing_messages (user_id, kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketing_messages_campaign ON marketing_messages (campaign_id);
-- Moi tai khoan chi nhan voucher chao mung mot lan (mot dong WALLET, them mot dong EMAIL neu co dong y)
CREATE UNIQUE INDEX IF NOT EXISTS uq_marketing_messages_welcome ON marketing_messages (user_id, channel) WHERE kind = 'WELCOME';
