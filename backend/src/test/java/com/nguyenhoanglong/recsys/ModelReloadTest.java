package com.nguyenhoanglong.recsys;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;

import static org.junit.jupiter.api.Assertions.*;

/** Sprint 7: a version promoted into the live directory replaces the bundled one without a restart. */
class ModelReloadTest {

    @TempDir
    Path liveRoot;

    private void promote(String model, String marker, String bin, String trainedAt) throws Exception {
        Path dir = Files.createDirectories(liveRoot.resolve(model));
        try (InputStream in = getClass().getResourceAsStream("/models/" + model + "/" + bin)) {
            Files.write(dir.resolve(bin), in.readAllBytes());
        }
        ObjectMapper mapper = new ObjectMapper();
        ObjectNode meta;
        try (InputStream in = getClass().getResourceAsStream("/models/" + model + "/" + marker)) {
            meta = (ObjectNode) mapper.readTree(in);
        }
        meta.put("trained_at", trainedAt);
        Path markerFile = dir.resolve(marker);
        mapper.writeValue(markerFile.toFile(), meta);
        // file systems with coarse timestamps: make sure the stamp moves
        Files.setLastModifiedTime(markerFile, FileTime.fromMillis(System.currentTimeMillis() + trainedAt.hashCode()));
    }

    @Test
    void sasrecSwitchesFromBundledToPromotedVersion() throws Exception {
        SasrecModel model = new SasrecModel(liveRoot.toString());
        assertTrue(model.isAvailable());
        String bundled = model.version();
        assertFalse(model.reloadIfChanged(), "nothing promoted yet");

        promote("sasrec", "items.json", "sasrec.onnx", "PROMOTED-1");
        assertTrue(model.reloadIfChanged());
        assertTrue(model.version().endsWith("PROMOTED-1"));
        assertNotEquals(bundled, model.version());
        assertTrue(model.isAvailable(), "still serves after the swap");
    }

    @Test
    void brokenPromotedFilesKeepTheWorkingVersion() throws Exception {
        OutfitModel model = new OutfitModel(liveRoot.toString());
        assertTrue(model.isAvailable());
        String bundled = model.version();

        Path dir = Files.createDirectories(liveRoot.resolve("outfit"));
        Files.writeString(dir.resolve("outfit.json"), "{ not json");
        Files.write(dir.resolve("outfit.bin"), new byte[]{1, 2, 3});

        assertFalse(model.reloadIfChanged());
        assertEquals(bundled, model.version());
        assertTrue(model.isAvailable());
    }

    @Test
    void outfitPicksUpPromotedVersion() throws Exception {
        OutfitModel model = new OutfitModel(liveRoot.toString());
        model.isAvailable();
        promote("outfit", "outfit.json", "outfit.bin", "PROMOTED-2");
        assertTrue(model.reloadIfChanged());
        assertTrue(model.version().endsWith("PROMOTED-2"));
    }
}
