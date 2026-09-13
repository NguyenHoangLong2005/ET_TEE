package com.ettee.opscore.systemops.service;

import com.ettee.opscore.common.dto.PageResponse;
import com.ettee.opscore.common.exception.AppExceptions;
import com.ettee.opscore.systemops.dto.*;
import com.ettee.opscore.systemops.entity.FeatureFlag;
import com.ettee.opscore.systemops.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SystemOpsService {

    private final AuditLogRepository auditLogRepository;
    private final ErrorLogRepository errorLogRepository;
    private final BackupLogRepository backupLogRepository;
    private final FeatureFlagRepository featureFlagRepository;
    private final ModelVersionRepository modelVersionRepository;

    @Transactional(readOnly = true)
    public PageResponse<AuditLogDto> searchAuditLogs(String entityType, Pageable pageable) {
        var page = auditLogRepository.search(entityType, pageable)
                .map(a -> new AuditLogDto(a.getId(), a.getActorUserId(), a.getAction(), a.getEntityType(),
                        a.getEntityId(), a.getOldValue(), a.getNewValue(), a.getCreatedAt()));
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public PageResponse<ErrorLogDto> listErrorLogs(Boolean resolved, Pageable pageable) {
        var page = (resolved == null ? errorLogRepository.findAllByOrderByOccurredAtDesc(pageable)
                : errorLogRepository.findByResolvedOrderByOccurredAtDesc(resolved, pageable))
                .map(e -> new ErrorLogDto(e.getId(), e.getServiceName(), e.getSeverity(), e.getMessage(),
                        e.isResolved(), e.getOccurredAt()));
        return PageResponse.from(page);
    }

    @Transactional(readOnly = true)
    public List<FeatureFlagDto> listFeatureFlags() {
        return featureFlagRepository.findAll().stream().map(this::toDto).toList();
    }

    @Transactional
    public FeatureFlagDto updateFeatureFlag(String key, UpdateFeatureFlagRequest request, UUID actorId) {
        FeatureFlag flag = featureFlagRepository.findByKey(key)
                .orElseThrow(() -> new AppExceptions.ResourceNotFoundException("Feature flag", key));
        if (request.enabled() != null) flag.setEnabled(request.enabled());
        if (request.rolloutPercentage() != null) flag.setRolloutPercentage(request.rolloutPercentage());
        flag.setUpdatedBy(actorId);
        return toDto(featureFlagRepository.save(flag));
    }

    private FeatureFlagDto toDto(FeatureFlag f) {
        return new FeatureFlagDto(f.getId(), f.getKey(), f.getDescription(), f.isEnabled(),
                f.getRolloutPercentage(), f.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public List<ModelVersionDto> listModelVersions(String modelName) {
        var list = modelName == null
                ? modelVersionRepository.findAllByOrderByTrainedAtDesc()
                : modelVersionRepository.findByModelNameOrderByTrainedAtDesc(modelName);
        return list.stream().map(m -> new ModelVersionDto(m.getId(), m.getModelName(), m.getVersionTag(),
                m.getModelType(), m.getEmbeddingDim(), m.getMetrics(), m.getTrainedAt())).toList();
    }
}
