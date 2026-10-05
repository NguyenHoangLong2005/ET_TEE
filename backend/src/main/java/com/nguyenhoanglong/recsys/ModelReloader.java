package com.nguyenhoanglong.recsys;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Picks up model versions promoted by scripts/pipeline/retrain.py into the live model directory,
 * without a restart. (The FP-Growth rules live in the database and CartComplementService re-reads
 * them on its own every 10 minutes.)
 */
@Component
public class ModelReloader {

    private static final Logger log = LoggerFactory.getLogger(ModelReloader.class);

    private final SasrecModel sasrec;
    private final OutfitModel outfit;

    public ModelReloader(SasrecModel sasrec, OutfitModel outfit) {
        this.sasrec = sasrec;
        this.outfit = outfit;
    }

    @Scheduled(fixedDelayString = "${app.recsys.reload-check-ms:60000}", initialDelay = 60000)
    public void reload() {
        if (sasrec.reloadIfChanged()) log.info("Home feed now serves {}", sasrec.version());
        if (outfit.reloadIfChanged()) log.info("PDP outfits now served by {}", outfit.version());
    }
}
