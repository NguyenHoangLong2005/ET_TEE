package com.ettee.opscore.systemops.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "backup_logs", schema = "ettee")
@Getter
@Setter
@NoArgsConstructor
public class BackupLog {

    @Id
    @UuidGenerator
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(name = "backup_type", nullable = false, length = 30)
    private String backupType;

    @Column(name = "file_location", columnDefinition = "text")
    private String fileLocation;

    @Column(nullable = false, length = 20)
    private String status = "pending";

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
