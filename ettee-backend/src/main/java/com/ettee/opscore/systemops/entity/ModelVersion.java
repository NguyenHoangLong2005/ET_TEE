package com.ettee.opscore.systemops.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "model_versions", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class ModelVersion {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "model_name", nullable = false, length = 100)
    private String modelName;

    @Column(name = "version_tag", nullable = false, length = 50)
    private String versionTag;

    // model_type là enum Postgres, entity này chỉ dùng để ĐỌC (không tạo/sửa) nên map thẳng String cho gọn.
    @Column(name = "model_type", nullable = false)
    private String modelType;

    @Column(name = "embedding_dim")
    private Integer embeddingDim;

    @Column(name = "artifact_uri", nullable = false, columnDefinition = "text")
    private String artifactUri;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private String metrics;

    @Column(name = "trained_at", nullable = false)
    private Instant trainedAt;

    @Column(name = "created_by", columnDefinition = "uuid")
    private UUID createdBy;
}
