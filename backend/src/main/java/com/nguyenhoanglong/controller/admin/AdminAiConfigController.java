package com.nguyenhoanglong.controller.admin;

import com.nguyenhoanglong.entity.AiModelVersion;
import com.nguyenhoanglong.recsys.OutfitModel;
import com.nguyenhoanglong.recsys.SasrecModel;
import com.nguyenhoanglong.repository.AiModelVersionRepository;
import com.nguyenhoanglong.service.AiFeatureFlags;
import com.nguyenhoanglong.service.CartComplementService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Trang admin "Mo hinh AI": CHI XEM.
 *
 * <p>Bang ai_model_versions la nhat ky do scripts/pipeline/retrain.py ghi sau moi lan huan
 * luyen; khong co gi trong he thong doc bang nay de chon mo hinh. Truoc day trang co nut
 * "Dang ky mo hinh" va "Kich hoat" - chi them dong / doi co is_active roi bao "he thong da
 * chuyen sang phuc vu..." trong khi mo hinh dang chay khong doi. Da bo hai thao tac do.</p>
 *
 * <p>"Co tinh nang AI": danh sach co dinh trong {@link AiFeatureFlags}, moi co duoc chuc nang
 * tuong ung kiem tra that truoc khi chay mo hinh.</p>
 *
 * <p>Cot "dang phuc vu" gio tinh tu phien ban backend THUC SU dang nap: file SASRec / CSN
 * outfit trong thu muc mo hinh live, va model_version cua luat FP-Growth trong CSDL.</p>
 */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasAuthority(T(com.nguyenhoanglong.constant.PermissionConstants).MANAGE_AI_MODEL_FEATURE_FLAG)")
public class AdminAiConfigController {

    /** Ten ma retrain.py ghi vao ai_model_versions (REGISTRY_NAME). */
    static final String SASREC = "SASRec - Danh rieng cho ban (trang chu)";
    static final String OUTFIT = "CSN outfit - Phoi tron bo (PDP)";
    static final String FPGROWTH = "FP-Growth - Thuong duoc mua kem (gio hang)";

    private final AiModelVersionRepository modelVersionRepository;
    private final SasrecModel sasrec;
    private final OutfitModel outfit;
    private final CartComplementService cartComplements;
    private final AiFeatureFlags aiFlags;

    public AdminAiConfigController(AiModelVersionRepository modelVersionRepository,
                                   SasrecModel sasrec,
                                   OutfitModel outfit,
                                   CartComplementService cartComplements,
                                   AiFeatureFlags aiFlags) {
        this.aiFlags = aiFlags;
        this.modelVersionRepository = modelVersionRepository;
        this.sasrec = sasrec;
        this.outfit = outfit;
        this.cartComplements = cartComplements;
    }

    /**
     * Moi phien ban da huan luyen, moi nhat truoc. {@code active} = true chi khi day dung la
     * phien ban backend dang dung de phuc vu khach.
     */
    @GetMapping("/model-versions")
    public ResponseEntity<List<Map<String, Object>>> getModelVersions() {
        Map<String, String> serving = new HashMap<>();
        if (sasrec.isAvailable()) serving.put(SASREC, sasrec.version());
        if (outfit.isAvailable()) serving.put(OUTFIT, outfit.version());
        String fp = cartComplements.servingModelVersion();
        if (fp != null) serving.put(FPGROWTH, fp);

        List<Map<String, Object>> rows = modelVersionRepository.findAll().stream()
                .sorted(Comparator.comparing(AiModelVersion::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(m -> {
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("id", m.getId());
                    row.put("modelName", m.getModelName());
                    row.put("version", m.getVersion());
                    row.put("description", m.getDescription());
                    row.put("createdAt", m.getCreatedAt());
                    row.put("active", Objects.equals(serving.get(m.getModelName()), m.getVersion()));
                    return row;
                })
                .toList();
        return ResponseEntity.ok(rows);
    }

    /** Bon cong tac AI co dinh, kem trang thai bat/tat. */
    @GetMapping("/feature-flags")
    public ResponseEntity<List<AiFeatureFlags.FlagState>> getFeatureFlags() {
        return ResponseEntity.ok(aiFlags.list());
    }

    /** Bat/tat mot cong tac; co hieu luc voi khach ngay lap tuc. Body: {"enabled": true|false}. */
    @PutMapping("/feature-flags/{key}")
    public ResponseEntity<AiFeatureFlags.FlagState> setFeatureFlag(@PathVariable String key,
                                                                   @RequestBody Map<String, Object> body) {
        AiFeatureFlags.Flag flag = AiFeatureFlags.Flag.byKey(key)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không có công tắc AI này"));
        Object enabled = body == null ? null : body.get("enabled");
        if (!(enabled instanceof Boolean b)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu trường enabled (true/false)");
        }
        return ResponseEntity.ok(aiFlags.set(flag, b));
    }
}
