-- Dang ky nhan tin tu form cong khai (hoac luc dang ky tai khoan chua xac thuc email) truoc day
-- vao thang danh sach marketing: ai cung dang ky duoc email cua nguoi khac. Gio cho o PENDING
-- cho toi khi chu email bam link xac nhan (hoac xac thuc email tai khoan).
ALTER TABLE marketing_subscriptions DROP CONSTRAINT IF EXISTS chk_marketing_subscriptions_status;
ALTER TABLE marketing_subscriptions ADD CONSTRAINT chk_marketing_subscriptions_status
    CHECK (status IN ('SUBSCRIBED', 'UNSUBSCRIBED', 'PENDING'));
