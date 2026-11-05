package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.FeatureFlag;
import com.nguyenhoanglong.repository.FeatureFlagRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Cong tac bat/tat THAT cho tung chuc nang AI (bang feature_flags). Moi chuc nang hoi
 * {@link #isEnabled(Flag)} truoc khi chay mo hinh; tat thi dung phuong an khong-AI.
 *
 * <p>Danh sach co la co dinh ({@link Flag}); admin chi bat/tat, khong tao co tuy y. Co chua co
 * dong trong bang duoc coi la BAT. Doc tu CSDL toi da moi {@link #CACHE_MS} ms mot lan; doi tren
 * may chu nay co hieu luc ngay.</p>
 */
@Service
public class AiFeatureFlags {

    public enum Flag {
        FOR_YOU("ai_for_you", "Dành riêng cho bạn (trang chủ)",
                "Gợi ý cá nhân bằng mô hình SASRec theo chuỗi sản phẩm khách vừa xem / thêm giỏ / mua. Tắt: trang chủ ẩn khối này."),
        OUTFIT("ai_outfit", "Phối trọn bộ (trang sản phẩm)",
                "Mô hình CSN chọn món phối hợp với sản phẩm đang xem. Tắt: dùng bộ phối do cửa hàng gán tay."),
        CART_COMPLEMENTS("ai_cart_complements", "Thường được mua kèm (giỏ hàng)",
                "Luật kết hợp FP-Growth từ lịch sử đơn hàng. Tắt: giỏ hàng ẩn khối gợi ý mua kèm."),
        SMART_SEARCH("ai_smart_search", "Tìm kiếm thông minh",
                "Tìm theo ngữ nghĩa (CLIP) kết hợp từ khóa, và tìm bằng ảnh. Tắt: chỉ tìm theo từ khóa, tắt tìm bằng ảnh.");

        public final String key;
        public final String label;
        public final String description;

        Flag(String key, String label, String description) {
            this.key = key;
            this.label = label;
            this.description = description;
        }

        public static Optional<Flag> byKey(String key) {
            return Arrays.stream(values()).filter(f -> f.key.equalsIgnoreCase(key)).findFirst();
        }
    }

    public record FlagState(String key, String label, String description, boolean enabled, LocalDateTime updatedAt) {}

    static final long CACHE_MS = 5_000;

    private final FeatureFlagRepository repository;
    private final Map<Flag, Boolean> cache = new ConcurrentHashMap<>();
    private volatile long loadedAt;

    public AiFeatureFlags(FeatureFlagRepository repository) {
        this.repository = repository;
    }

    public boolean isEnabled(Flag flag) {
        if (System.currentTimeMillis() - loadedAt > CACHE_MS) reload();
        return cache.getOrDefault(flag, true);
    }

    public List<FlagState> list() {
        reload();
        return Arrays.stream(Flag.values()).map(f -> {
            FeatureFlag row = repository.findById(f.key).orElse(null);
            return new FlagState(f.key, f.label, f.description,
                    row == null || row.isEnabled(), row == null ? null : row.getUpdatedAt());
        }).toList();
    }

    public FlagState set(Flag flag, boolean enabled) {
        FeatureFlag row = repository.findById(flag.key).orElseGet(FeatureFlag::new);
        row.setKey(flag.key);
        row.setDescription(flag.label);
        row.setEnabled(enabled);
        row.setUpdatedAt(LocalDateTime.now());
        repository.save(row);
        cache.put(flag, enabled);
        return new FlagState(flag.key, flag.label, flag.description, enabled, row.getUpdatedAt());
    }

    private synchronized void reload() {
        try {
            for (Flag f : Flag.values()) {
                cache.put(f, repository.findById(f.key).map(FeatureFlag::isEnabled).orElse(true));
            }
        } catch (RuntimeException e) {
            // CSDL tam loi: giu gia tri cu (mac dinh bat) thay vi lam hong trang khach
        } finally {
            loadedAt = System.currentTimeMillis();
        }
    }
}
