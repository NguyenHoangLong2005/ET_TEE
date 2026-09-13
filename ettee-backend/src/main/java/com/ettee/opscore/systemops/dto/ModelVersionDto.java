package com.ettee.opscore.systemops.dto;

import java.time.Instant;
import java.util.UUID;

public record ModelVersionDto(UUID id, String modelName, String versionTag, String modelType,
                               Integer embeddingDim, String metrics, Instant trainedAt) {
}
