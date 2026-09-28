package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.AiModelVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiModelVersionRepository extends JpaRepository<AiModelVersion, Long> {
}
