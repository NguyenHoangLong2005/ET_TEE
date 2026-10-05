package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.recsys.SasrecModel;
import com.nguyenhoanglong.repository.ProductRepository;
import com.nguyenhoanglong.repository.UserBehaviorEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Home page "Danh rieng cho ban": ranks products from the shopper's own recent behavior.
 *
 *   SASREC       the sequential model (models/sasrec) scores the next item from the recent sequence
 *   CLIP_RECENT  no model loaded (or none of the recent items is in its vocabulary): nearest
 *                products to the mean CLIP vector of the last few items
 *   NONE         no behavior yet - the page shows nothing personalised rather than pretending
 */
@Service
public class ForYouService {

    public enum Strategy { SASREC, CLIP_RECENT, NONE }

    public record ForYouResult(Strategy strategy, String model, List<ProductDto> products) {}

    static final List<String> SEQUENCE_EVENTS = List.of(
            BehaviorEventService.VIEW, BehaviorEventService.ADD_TO_CART, BehaviorEventService.PURCHASE);
    /** Raw events read per request; collapsed into at most model.maxlen() steps. */
    static final int HISTORY_WINDOW = 200;
    static final int CLIP_RECENT_ITEMS = 5;

    private static final Logger log = LoggerFactory.getLogger(ForYouService.class);

    private final UserBehaviorEventRepository eventRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;
    private final SasrecModel model;

    public ForYouService(UserBehaviorEventRepository eventRepository, ProductRepository productRepository,
                         ProductService productService, SasrecModel model) {
        this.eventRepository = eventRepository;
        this.productRepository = productRepository;
        this.productService = productService;
        this.model = model;
    }

    @Transactional(readOnly = true)
    public ForYouResult recommend(String userKey, int limit) {
        if (userKey == null) return new ForYouResult(Strategy.NONE, null, List.of());
        List<Long> recent = new ArrayList<>(eventRepository.findRecentProductIds(
                userKey, SEQUENCE_EVENTS, PageRequest.of(0, HISTORY_WINDOW)));
        if (recent.isEmpty()) return new ForYouResult(Strategy.NONE, null, List.of());
        Collections.reverse(recent);                                  // oldest first
        // things just looked at / bought are not news on the home page
        Set<Long> exclude = new HashSet<>(recent);

        if (model.isAvailable()) {
            List<Long> sequence = model.toSequence(recent);
            if (!sequence.isEmpty()) {
                // over-fetch: some ranked ids may have gone inactive since training
                List<Long> ids = model.recommend(sequence, limit * 2, exclude);
                List<ProductDto> products = productService.getActiveProductsInOrder(ids);
                if (!products.isEmpty()) {
                    return new ForYouResult(Strategy.SASREC, model.version(), cap(products, limit));
                }
            }
        }

        List<Long> lastItems = lastDistinct(recent, CLIP_RECENT_ITEMS);
        try {
            productRepository.enableHnswIterativeScan();
            List<Long> ids = productRepository.findNearestToMeanEmbedding(lastItems, new ArrayList<>(exclude), limit);
            List<ProductDto> products = productService.getActiveProductsInOrder(ids);
            if (!products.isEmpty()) {
                return new ForYouResult(Strategy.CLIP_RECENT, "CLIP mean of last " + CLIP_RECENT_ITEMS, products);
            }
        } catch (RuntimeException e) {
            log.warn("CLIP fallback for the home feed failed", e);
        }
        return new ForYouResult(Strategy.NONE, null, List.of());
    }

    static List<Long> lastDistinct(List<Long> chronological, int n) {
        LinkedHashSet<Long> out = new LinkedHashSet<>();
        for (int i = chronological.size() - 1; i >= 0 && out.size() < n; i--) {
            out.add(chronological.get(i));
        }
        return new ArrayList<>(out);
    }

    private static <T> List<T> cap(List<T> list, int n) {
        return list.size() > n ? list.subList(0, n) : list;
    }
}
