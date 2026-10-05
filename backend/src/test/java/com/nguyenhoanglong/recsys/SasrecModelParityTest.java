package com.nguyenhoanglong.recsys;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The ONNX model shipped in src/main/resources/models/sasrec must rank exactly like PyTorch did at
 * export time (fixture written by scripts/sasrec/train.py): same padding, same index mapping.
 */
class SasrecModelParityTest {

    private final SasrecModel model = new SasrecModel("target/no-live-models");

    @Test
    void javaRankingMatchesPytorch() throws Exception {
        assertTrue(model.isAvailable(), "exported model missing - run scripts/sasrec/train.py");
        JsonNode cases;
        try (InputStream in = getClass().getResourceAsStream("/sasrec/parity.json")) {
            assertNotNull(in, "parity fixture missing - run scripts/sasrec/train.py");
            cases = new ObjectMapper().readTree(in);
        }
        for (JsonNode c : cases) {
            List<Long> history = new ArrayList<>();
            c.get("history").forEach(n -> history.add(n.asLong()));
            List<Long> expected = new ArrayList<>();
            c.get("top10").forEach(n -> expected.add(n.asLong()));

            List<Long> actual = model.recommend(model.toSequence(history), 10, Set.of());

            assertEquals(expected, actual);
        }
    }

    @Test
    void sequenceRulesMatchTheTrainingPipeline() {
        assertTrue(model.isAvailable());
        long known = 0;
        // first known product id in the vocabulary
        for (long id = 1; id < 100_000 && known == 0; id++) {
            if (!model.toSequence(List.of(id)).isEmpty()) known = id;
        }
        assertNotEquals(0, known);
        // unknown ids dropped, consecutive repeats collapsed (VIEW then ADD_TO_CART of one item)
        assertEquals(List.of(known), model.toSequence(List.of(-1L, known, known, -2L)));
    }
}
