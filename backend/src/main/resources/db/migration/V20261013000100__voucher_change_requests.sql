-- Nhan vien marketing sua / xoa voucher da duoc duyet thi phai qua chu cua hang duyet lai. Voucher
-- van chay nguyen trang trong luc cho; payload giu cac truong de xuat de ap dung khi duyet.
-- Khong dat khoa ngoai toi vouchers: duyet yeu cau xoa se xoa han voucher, lich su yeu cau van giu.
CREATE TABLE IF NOT EXISTS voucher_change_requests (
    request_id    BIGSERIAL     PRIMARY KEY,
    voucher_id    BIGINT        NOT NULL,
    shop_id       BIGINT,
    action        VARCHAR(20)   NOT NULL,
    payload       TEXT,
    summary       TEXT,
    requested_by  VARCHAR(255),
    status        VARCHAR(30)   NOT NULL DEFAULT 'PENDING',
    created_at    TIMESTAMP     NOT NULL DEFAULT now(),
    reviewed_by   VARCHAR(255),
    reviewed_at   TIMESTAMP,
    review_note   VARCHAR(500),
    CONSTRAINT chk_voucher_change_requests_action CHECK (action IN ('UPDATE', 'DELETE'))
);
CREATE INDEX IF NOT EXISTS idx_voucher_change_requests_voucher_status ON voucher_change_requests (voucher_id, status);
-- Moi voucher chi co mot yeu cau dang cho duyet.
CREATE UNIQUE INDEX IF NOT EXISTS uq_voucher_change_requests_pending ON voucher_change_requests (voucher_id) WHERE status = 'PENDING';
