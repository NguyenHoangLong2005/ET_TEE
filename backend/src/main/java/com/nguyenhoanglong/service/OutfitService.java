package com.nguyenhoanglong.service;

import com.nguyenhoanglong.dto.ProductDto;
import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.exception.ResourceNotFoundException;
import com.nguyenhoanglong.recsys.OutfitModel;
import com.nguyenhoanglong.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * PDP "Phoi tron bo" (Sprint 4): completes an outfit around the product being viewed.
 *
 * The slots to fill come from the model's template (a top gets bottom + outer + accessory, a dress
 * gets outer + accessory, ...). Slots are filled greedily: each candidate is scored by its
 * compatibility with the viewed product plus half its mean compatibility with the pieces already
 * chosen, so the set holds together rather than each piece only matching the anchor.
 * Without a model (or for a product it does not know) the old rule-based list is returned.
 */
@Service
public class OutfitService {

    public enum Strategy { MODEL, RULE }

    public record OutfitPiece(String slot, ProductDto product, List<ProductDto> alternatives) {}

    public record Outfit(Strategy strategy, String model, String anchorSlot, List<OutfitPiece> pieces) {}

    static final int ALTERNATIVES = 2;
    static final double SET_WEIGHT = 0.5;

    private final OutfitModel model;
    private final ProductRepository productRepository;
    private final ProductService productService;

    public OutfitService(OutfitModel model, ProductRepository productRepository, ProductService productService) {
        this.model = model;
        this.productRepository = productRepository;
        this.productService = productService;
    }

    @Transactional(readOnly = true)
    public Outfit outfitFor(String slug) {
        Product anchor = productRepository.findBySlug(slug)
                .filter(p -> "ACTIVE".equals(p.getStatus()))
                .orElseThrow(() -> new ResourceNotFoundException("Product", "slug", slug));
        String anchorSlot = model.isAvailable() ? model.slotOfType(anchor.getProductType()) : null;
        if (anchorSlot == null || !model.knows(anchor.getId())) {
            List<OutfitPiece> pieces = productService.getOutfits(slug).stream()
                    .map(p -> new OutfitPiece(null, p, List.of()))
                    .toList();
            return new Outfit(Strategy.RULE, null, null, pieces);
        }

        String group = OutfitModel.groupOf(anchor.getTargetGroup());
        List<Long> chosen = new ArrayList<>();
        List<String> slotOrder = new ArrayList<>();
        Map<String, List<Long>> rankedBySlot = new LinkedHashMap<>();
        for (String slot : model.templateFor(anchorSlot)) {
            List<Long> candidates = model.candidates(slot, group);
            candidates.remove(anchor.getId());
            if (candidates.isEmpty()) continue;
            List<Long> ranked = rank(anchor.getId(), candidates, chosen);
            // keep a few spares per slot: some may have gone inactive since training
            List<Long> top = ranked.subList(0, Math.min(ranked.size(), ALTERNATIVES + 4));
            rankedBySlot.put(slot, top);
            slotOrder.add(slot);
            chosen.add(top.get(0));
        }

        List<Long> all = rankedBySlot.values().stream().flatMap(List::stream).distinct().toList();
        Map<Long, ProductDto> active = new HashMap<>();
        productService.getActiveProductsInOrder(all).forEach(p -> active.put(p.getId(), p));
        List<OutfitPiece> pieces = new ArrayList<>();
        for (String slot : slotOrder) {
            List<ProductDto> available = rankedBySlot.get(slot).stream()
                    .map(active::get).filter(Objects::nonNull).toList();
            if (available.isEmpty()) continue;
            pieces.add(new OutfitPiece(slot, available.get(0),
                    available.subList(1, Math.min(available.size(), 1 + ALTERNATIVES))));
        }
        return new Outfit(Strategy.MODEL, model.version(), anchorSlot, pieces);
    }

    List<Long> rank(long anchor, List<Long> candidates, List<Long> chosen) {
        Map<Long, Double> score = new HashMap<>();
        for (Long c : candidates) {
            double s = model.compat(anchor, c);
            if (!chosen.isEmpty()) {
                double set = 0;
                for (Long x : chosen) set += model.compat(x, c);
                s += SET_WEIGHT * set / chosen.size();
            }
            score.put(c, s);
        }
        List<Long> ranked = new ArrayList<>(candidates);
        ranked.sort(Comparator.comparingDouble((Long c) -> score.get(c)).reversed().thenComparing(c -> c));
        return ranked;
    }
}
