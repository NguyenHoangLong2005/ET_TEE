package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.SystemSetting;
import com.nguyenhoanglong.repository.SystemSettingRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/settings")
public class AdminSystemController {

    private final SystemSettingRepository settingRepository;

    public AdminSystemController(SystemSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @PostConstruct
    public void initDefaultSettings() {
        try {
            Map<String, String> defaults = new LinkedHashMap<>();
            defaults.put("payment_momo_enabled", "true");
            defaults.put("payment_cod_enabled", "true");
            defaults.put("payment_vnpay_enabled", "true");
            defaults.put("shipping_free_threshold", "500000");
            defaults.put("shipping_standard_fee", "30000");
            defaults.put("shipping_express_fee", "50000");
            defaults.put("system_maintenance_mode", "false");
            defaults.put("brand_hotline", "1900 6868");
            defaults.put("brand_email", "support@ettee.vn");

            for (Map.Entry<String, String> entry : defaults.entrySet()) {
                if (!settingRepository.existsById(entry.getKey())) {
                    SystemSetting setting = new SystemSetting();
                    setting.setKey(entry.getKey());
                    setting.setValue(entry.getValue());
                    setting.setUpdatedAt(LocalDateTime.now());
                    settingRepository.save(setting);
                }
            }
        } catch (Exception ignored) {
        }
    }

    @GetMapping
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).CONFIG_PAYMENT_SHIPPING)")
    public ResponseEntity<?> getSettings() {
        List<SystemSetting> list = settingRepository.findAll();
        Map<String, String> map = new HashMap<>();
        for (SystemSetting s : list) {
            map.put(s.getKey(), s.getValue());
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", list);
        result.put("settings", map);
        return ResponseEntity.ok(result);
    }

    @PostMapping
    @PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).CONFIG_PAYMENT_SHIPPING)")
    public ResponseEntity<?> saveSettings(@RequestBody Map<String, Object> payload) {
        for (Map.Entry<String, Object> entry : payload.entrySet()) {
            if (entry.getValue() != null) {
                SystemSetting setting = settingRepository.findById(entry.getKey()).orElse(new SystemSetting());
                setting.setKey(entry.getKey());
                setting.setValue(String.valueOf(entry.getValue()));
                setting.setUpdatedAt(LocalDateTime.now());
                settingRepository.save(setting);
            }
        }
        return ResponseEntity.ok(Map.of("message", "Đã lưu cài đặt hệ thống thành công"));
    }
}
