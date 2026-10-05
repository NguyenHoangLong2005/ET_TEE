-- Sprint 2 (session-based recommender): trang chu doc "N su kien gan nhat cua user" moi lan tai,
-- va pipeline train sap xep su kien theo (user, thoi gian). idx_ube_user_id don le khong phuc vu
-- duoc ORDER BY created_at DESC nen thay bang index ghep.
CREATE INDEX IF NOT EXISTS idx_ube_user_created_at
    ON user_behavior_events (user_id, created_at DESC);

DROP INDEX IF EXISTS idx_ube_user_id;
