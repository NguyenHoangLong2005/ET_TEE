package com.nguyenhoanglong.recsys;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;

/** Java reads outfit.bin / outfit.json and scores exactly like numpy did (scripts/outfit/train_outfit.py). */
class OutfitModelParityTest {

    private final OutfitModel model = new OutfitModel("target/no-live-models");

    @Test
    void compatMatchesPython() throws Exception {
        assertTrue(model.isAvailable(), "exported model missing - run scripts/outfit/train_outfit.py");
        JsonNode cases;
        try (InputStream in = getClass().getResourceAsStream("/outfit/parity.json")) {
            assertNotNull(in, "parity fixture missing - run scripts/outfit/train_outfit.py");
            cases = new ObjectMapper().readTree(in);
        }
        for (JsonNode c : cases) {
            assertEquals(c.get("compat").asDouble(), model.compat(c.get("a").asLong(), c.get("b").asLong()), 1e-4);
        }
    }

    @Test
    void templatesAndGroupsFollowTheTrainingScript() {
        assertTrue(model.isAvailable());
        assertEquals("top", model.slotOfType("Polo"));
        assertNull(model.slotOfType("homewear"));            // not dressed up in outfits
        assertEquals(java.util.List.of("bottom", "outer", "accessory"), model.templateFor("top"));
        assertTrue(OutfitModel.groupFits("men", "unisex"));
        assertFalse(OutfitModel.groupFits("men", "women"));
        assertTrue(OutfitModel.groupFits("unisex", "kids"));
    }
}
