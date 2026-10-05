package com.nguyenhoanglong.recsys;

import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Where a model's files come from (Sprint 7). The retraining pipeline (scripts/pipeline/retrain.py)
 * promotes new versions into {@code <app.recsys.model-dir>/<name>/}; until it has done so for a model,
 * the version bundled in the jar ({@code classpath:models/<name>/}) is used.
 */
final class ModelFiles {

    private final Path liveDir;
    private final String bundled;

    ModelFiles(String modelDir, String name) {
        this.liveDir = Path.of(modelDir, name);
        this.bundled = "classpath:models/" + name + "/";
    }

    /** True when the pipeline has promoted this model (its marker file exists in the live directory). */
    boolean live(String markerFile) {
        return Files.isRegularFile(liveDir.resolve(markerFile));
    }

    Resource resource(String file, boolean live) {
        return live ? new FileSystemResource(liveDir.resolve(file)) : new DefaultResourceLoader().getResource(bundled + file);
    }

    /** Changes whenever a new version is promoted ("bundled" before the first promotion). */
    String stamp(String markerFile) {
        Path marker = liveDir.resolve(markerFile);
        try {
            return Files.isRegularFile(marker) ? marker + "@" + Files.getLastModifiedTime(marker).toMillis() : "bundled";
        } catch (IOException e) {
            return "bundled";
        }
    }

    String describe(boolean live) {
        return live ? liveDir.toAbsolutePath().toString() : bundled;
    }
}
