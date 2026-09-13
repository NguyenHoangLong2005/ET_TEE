package com.ettee.opscore.systemops.repository;

import com.ettee.opscore.systemops.entity.ModelVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ModelVersionRepository extends JpaRepository<ModelVersion, UUID> {
    List<ModelVersion> findAllByOrderByTrainedAtDesc();
    List<ModelVersion> findByModelNameOrderByTrainedAtDesc(String modelName);
}
