package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.AiModelVersion;
import com.nguyenhoanglong.entity.FeatureFlag;
import com.nguyenhoanglong.entity.SystemNotification;
import com.nguyenhoanglong.repository.AiModelVersionRepository;
import com.nguyenhoanglong.repository.FeatureFlagRepository;
import com.nguyenhoanglong.repository.SystemNotificationRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_AI_MODEL_FEATURE_FLAG)")
public class AdminAiConfigController {

    private final FeatureFlagRepository featureFlagRepository;
    private final AiModelVersionRepository modelVersionRepository;
    private final SystemNotificationRepository notificationRepository;

    public AdminAiConfigController(FeatureFlagRepository featureFlagRepository,
                                   AiModelVersionRepository modelVersionRepository,
                                   SystemNotificationRepository notificationRepository) {
        this.featureFlagRepository = featureFlagRepository;
        this.modelVersionRepository = modelVersionRepository;
        this.notificationRepository = notificationRepository;
    }

    @PostConstruct
    public void initDefaults() {
        try {
            if (featureFlagRepository.count() == 0) {
                createFlag("smart_search", "Tìm kiếm thông minh ngữ nghĩa (Semantic Vector Search)", true);
                createFlag("personalized_recommendations", "Gợi ý trang phục cá nhân hóa theo phong cách", true);
                createFlag("virtual_fitting_assistant", "Trợ lý AI tư vấn chọn size & tỷ lệ cơ thể", true);
                createFlag("similar_products_engine", "Gợi ý sản phẩm phối đồ tương đồng (Visual Outfit)", true);
                createFlag("stock_demand_forecasting", "Dự báo nhu cầu nhập kho & bán chậm bằng Machine Learning", false);
            }

            if (modelVersionRepository.count() == 0) {
                AiModelVersion m1 = new AiModelVersion();
                m1.setModelName("ET-StyleMatch");
                m1.setVersion("v2.1-turbo");
                m1.setActive(true);
                m1.setDescription("Mô hình gợi ý phối đồ đa tiêu chí kết hợp Contrastive Learning & Fashion-CLIP.");
                m1.setCreatedAt(LocalDateTime.now().minusDays(15));
                modelVersionRepository.save(m1);

                AiModelVersion m2 = new AiModelVersion();
                m2.setModelName("ET-FashionEmbed");
                m2.setVersion("v1.4.2");
                m2.setActive(false);
                m2.setDescription("Mô hình Vector Embedding 512-dim cho phân loại danh mục và thuộc tính vải.");
                m2.setCreatedAt(LocalDateTime.now().minusDays(30));
                modelVersionRepository.save(m2);
            }
        } catch (Exception ignored) {
        }
    }

    private void createFlag(String key, String desc, boolean enabled) {
        FeatureFlag flag = new FeatureFlag();
        flag.setKey(key);
        flag.setDescription(desc);
        flag.setEnabled(enabled);
        flag.setUpdatedAt(LocalDateTime.now());
        featureFlagRepository.save(flag);
    }

    @GetMapping("/feature-flags")
    public ResponseEntity<?> getFeatureFlags() {
        return ResponseEntity.ok(featureFlagRepository.findAll());
    }

    @PostMapping("/feature-flags")
    public ResponseEntity<?> saveFeatureFlag(@RequestBody Map<String, Object> payload) {
        String key = (String) payload.get("key");
        if (key == null || key.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Key không được để trống"));
        }
        key = key.trim().toLowerCase().replaceAll("[^a-z0-9_-]", "_");

        FeatureFlag flag = featureFlagRepository.findById(key).orElse(new FeatureFlag());
        flag.setKey(key);
        if (payload.containsKey("description")) {
            flag.setDescription((String) payload.get("description"));
        }
        if (payload.containsKey("enabled")) {
            flag.setEnabled(Boolean.parseBoolean(String.valueOf(payload.get("enabled"))));
        }
        flag.setUpdatedAt(LocalDateTime.now());
        featureFlagRepository.save(flag);

        return ResponseEntity.ok(flag);
    }

    @PostMapping("/feature-flags/{key}")
    public ResponseEntity<?> toggleFeatureFlag(@PathVariable String key, @RequestBody Map<String, Object> payload) {
        FeatureFlag flag = featureFlagRepository.findById(key).orElse(new FeatureFlag());
        flag.setKey(key);
        boolean enabled = Boolean.parseBoolean(String.valueOf(payload.getOrDefault("enabled", !flag.isEnabled())));
        flag.setEnabled(enabled);
        flag.setUpdatedAt(LocalDateTime.now());
        featureFlagRepository.save(flag);

        // Notify admins
        try {
            SystemNotification notif = new SystemNotification();
            notif.setType("AI_FEATURE_CHANGED");
            notif.setTitle("Thay đổi cờ tính năng: " + key);
            notif.setMessage("Cờ tính năng AI '" + key + "' vừa được chuyển sang trạng thái: " + (enabled ? "BẬT" : "TẮT"));
            notif.setSeverity("INFO");
            notif.setTargetUrl("/admin/ai-feature-flags");
            notif.setCreatedAt(LocalDateTime.now());
            notificationRepository.save(notif);
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok(flag);
    }

    @DeleteMapping("/feature-flags/{key}")
    public ResponseEntity<?> deleteFeatureFlag(@PathVariable String key) {
        if (!featureFlagRepository.existsById(key)) {
            return ResponseEntity.notFound().build();
        }
        featureFlagRepository.deleteById(key);
        return ResponseEntity.ok(Map.of("message", "Đã xóa cờ tính năng " + key));
    }

    @GetMapping("/model-versions")
    public ResponseEntity<?> getModelVersions() {
        return ResponseEntity.ok(modelVersionRepository.findAll());
    }

    @PostMapping("/model-versions")
    public ResponseEntity<?> registerModelVersion(@RequestBody Map<String, Object> payload) {
        String name = (String) payload.get("modelName");
        String version = (String) payload.get("version");
        if (name == null || version == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tên model và phiên bản là bắt buộc"));
        }

        AiModelVersion model = new AiModelVersion();
        model.setModelName(name.trim());
        model.setVersion(version.trim());
        model.setDescription((String) payload.getOrDefault("description", ""));
        model.setActive(Boolean.parseBoolean(String.valueOf(payload.getOrDefault("active", false))));
        model.setCreatedAt(LocalDateTime.now());
        modelVersionRepository.save(model);

        return ResponseEntity.ok(model);
    }

    @PostMapping("/model-versions/{id}/activate")
    public ResponseEntity<?> activateModelVersion(@PathVariable Long id) {
        return modelVersionRepository.findById(id).map(model -> {
            // Deactivate all models
            List<AiModelVersion> all = modelVersionRepository.findAll();
            for (AiModelVersion m : all) {
                m.setActive(m.getId().equals(id));
                modelVersionRepository.save(m);
            }

            try {
                SystemNotification notif = new SystemNotification();
                notif.setType("AI_FEATURE_CHANGED");
                notif.setTitle("Kích hoạt phiên bản AI mới: " + model.getModelName() + " (" + model.getVersion() + ")");
                notif.setMessage("Hệ thống đã chuyển sang phục vụ bằng mô hình AI " + model.getModelName() + " phiên bản " + model.getVersion());
                notif.setSeverity("SUCCESS");
                notif.setTargetUrl("/admin/ai-config");
                notif.setCreatedAt(LocalDateTime.now());
                notificationRepository.save(notif);
            } catch (Exception ignored) {
            }

            return ResponseEntity.ok(Map.of("message", "Đã kích hoạt phiên bản " + model.getVersion(), "model", model));
        }).orElse(ResponseEntity.notFound().build());
    }
}
