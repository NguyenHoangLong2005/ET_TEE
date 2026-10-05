package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.AiModelVersion;
import com.nguyenhoanglong.entity.FeatureFlag;
import com.nguyenhoanglong.entity.SystemNotification;
import com.nguyenhoanglong.repository.AiModelVersionRepository;
import com.nguyenhoanglong.repository.FeatureFlagRepository;
import com.nguyenhoanglong.repository.SystemNotificationRepository;
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

    // This used to auto-seed fictional data on startup: feature flags
    // claiming "Trợ lý AI tư vấn chọn size" and "Dự báo nhu cầu nhập kho
    // bằng Machine Learning" exist and are ON, plus a fake model
    // "ET-StyleMatch v2.1-turbo" described as using "Contrastive Learning &
    // Fashion-CLIP" - none of which exists anywhere in this codebase (grep
    // confirms nothing reads FeatureFlag/AiModelVersion to gate any real
    // behavior). An admin opening this screen would see specific, detailed
    // claims about AI systems that are pure fiction. Removed the seeding;
    // the CRUD below is real and still usable once/if an actual feature
    // flag or model registry is needed, it just starts empty and honest
    // instead of pre-populated with invented capabilities.

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
