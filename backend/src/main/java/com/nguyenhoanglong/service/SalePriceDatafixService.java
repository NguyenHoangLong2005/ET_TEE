package com.nguyenhoanglong.service;

import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import com.nguyenhoanglong.repository.ProductRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

/**
 * Phase B datafix service. Sets a valid {@code salePrice} (lower than price) on
 * a subset of active products so the storefront sale UI can surface them.
 *
 * <p>Design rules (per the Phase B spec):
 * <ul>
 *   <li>Discount range: {@code salePrice ∈ [price * 0.70, price * 0.90]} (i.e. 10%-30% off).</li>
 *   <li>Only active products are eligible. A product is considered active when
 *       it has {@code price > 0}, no existing valid {@code salePrice}, and
 *       (when present) {@code status} is {@code null} or equals "ACTIVE".</li>
 *   <li>Only a subset of eligible products is updated. The target share is
 *       controlled by {@code app.datafix.sale-price.target-share} (default 0.35
 *       = 35%).</li>
 *   <li>The selection is stable: products are sorted by id, then a deterministic
 *       first-N slice is chosen. Re-running the datafix produces the same set.</li>
 *   <li>Idempotent: products that already have {@code salePrice < price} are
 *       skipped without mutation.</li>
 *   <li>A Markdown report is written next to the jar at
 *       {@code <workingDir>/sale-price-fix-report.md} with one row per updated
 *       product. The path is also returned by {@link #run()}.</li>
 * </ul>
 */
@Service
public class SalePriceDatafixService {

    private static final Logger log = LoggerFactory.getLogger(SalePriceDatafixService.class);
    private static final DateTimeFormatter TIMESTAMP_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ProductRepository productRepository;
    private final double targetShare;
    private final String reportPath;

    @PersistenceContext
    EntityManager entityManager;

    public SalePriceDatafixService(ProductRepository productRepository,
                                   @Value("${app.datafix.saleprice.target-share:0.35}") double targetShare,
                                   @Value("${app.datafix.saleprice.report-path:sale-price-fix-report.md}") String reportPath) {
        this.productRepository = productRepository;
        if (targetShare < 0 || targetShare > 1) {
            throw new IllegalArgumentException("app.datafix.saleprice.target-share must be in [0,1]");
        }
        this.targetShare = targetShare;
        this.reportPath = reportPath;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public DatafixReport run() {
        List<Product> all = productRepository.findAll();
        List<Product> eligible = new ArrayList<>();
        for (Product p : all) {
            if (isEligible(p)) {
                eligible.add(p);
            }
        }
        eligible.sort(Comparator.comparing(Product::getId));

        int targetCount = (int) Math.round(eligible.size() * targetShare);
        List<Product> targets = eligible.subList(0, Math.min(targetCount, eligible.size()));

        Random rng = new Random(20260913L); // deterministic seed for stable re-runs
        List<UpdateRecord> updates = new ArrayList<>();
        int skipped = 0;
        for (Product p : targets) {
            BigDecimal price = p.getPrice();
            if (price == null || price.signum() <= 0) {
                skipped++;
                continue;
            }

            // Pick a uniform discount in [10%, 30%]
            double discountPercent = 0.10 + rng.nextDouble() * 0.20;
            BigDecimal multiplier = BigDecimal.valueOf(1.0 - discountPercent);
            BigDecimal newSalePrice = com.nguyenhoanglong.util.PriceUtils.roundToThousand(price.multiply(multiplier)).setScale(2, RoundingMode.HALF_UP);

            // Make absolutely sure it is strictly less than price; if rounding
            // pushed it equal, drop one cent.
            if (newSalePrice.compareTo(price) >= 0) {
                newSalePrice = price.subtract(BigDecimal.valueOf(1000)).setScale(2, RoundingMode.HALF_UP);
            }
            if (newSalePrice.signum() <= 0) {
                // Should never happen for prices >= 1.00, but guard anyway.
                skipped++;
                continue;
            }

            BigDecimal oldPrice = price;
            BigDecimal oldSalePrice = p.getSalePrice();
            p.setSalePrice(newSalePrice);
            p.setIsSale(true);
            Product saved = productRepository.save(p);
            // The cart and checkout charge variant.salePrice, so a product-only discount is
            // advertised but never billed. A bulk UPDATE avoids loading the variant collection
            // (cascade=ALL + orphanRemoval made per-entity writes stall the session).
            int variantsTouched = entityManager.createQuery(
                            "UPDATE ProductVariant v SET v.salePrice = :sale "
                                    + "WHERE v.product.id = :pid AND v.price = :price")
                    .setParameter("sale", newSalePrice)
                    .setParameter("pid", p.getId())
                    .setParameter("price", price)
                    .executeUpdate();
            // Force the UPDATE to hit the DB now so we don't depend on the
            // outer @Transactional commit ordering.
            entityManager.flush();
            entityManager.clear();
            log.info("Datafix persisted product id={} salePrice={}", saved.getId(), saved.getSalePrice());

            updates.add(new UpdateRecord(
                    p.getId(),
                    p.getName(),
                    p.getSlug(),
                    p.getTargetGroup(),
                    oldPrice,
                    oldSalePrice,
                    newSalePrice,
                    discountPercent * 100.0,
                    variantsTouched
            ));
        }

        writeReport(all.size(), eligible.size(), updates, skipped);

        log.info("Phase B salePrice datafix: eligible {} / {}, updated {}, skipped {} (report={})",
                eligible.size(), all.size(), updates.size(), skipped, reportPath);
        return new DatafixReport(updates.size(), skipped, eligible.size(), all.size(), reportPath);
    }

    private boolean isEligible(Product p) {
        if (p.getPrice() == null || p.getPrice().signum() <= 0) return false;
        BigDecimal existing = p.getSalePrice();
        if (existing != null && existing.signum() > 0 && existing.compareTo(p.getPrice()) < 0) {
            // Already a valid sale price — leave untouched.
            return false;
        }
        if (p.getStatus() != null) {
            String s = p.getStatus().toUpperCase();
            if (!"ACTIVE".equals(s) && !"PUBLISHED".equals(s)) {
                return false;
            }
        }
        return true;
    }

    private void writeReport(int totalProducts, int eligibleCount, List<UpdateRecord> updates, int skipped) {
        StringBuilder md = new StringBuilder();
        md.append("# Sale-Price Datafix Report (Phase B)\n\n");
        md.append("- Generated: ").append(LocalDateTime.now().format(TIMESTAMP_FMT)).append("\n");
        md.append("- Total products in DB: ").append(totalProducts).append("\n");
        md.append("- Eligible products (no valid salePrice yet): ").append(eligibleCount).append("\n");
        md.append("- Updated this run: ").append(updates.size()).append("\n");
        md.append("- Skipped: ").append(skipped).append("\n");
        md.append("- Discount range: 10% – 30%\n");
        md.append("- Targeting share: ").append(Math.round(targetShare * 100)).append("% of eligible products\n");
        md.append("- Idempotent: re-running will skip products that already have salePrice &lt; price.\n\n");

        md.append("## Updated products\n\n");
        md.append("| ProductId | Name | TargetGroup | Old Price | Old SalePrice | New SalePrice | Discount % | Variants touched |\n");
        md.append("|---|---|---|---:|---:|---:|---:|---:|\n");
        for (UpdateRecord u : updates) {
            md.append("| ").append(u.productId)
                    .append(" | ").append(escapeMd(u.name))
                    .append(" | ").append(u.targetGroup == null ? "-" : u.targetGroup)
                    .append(" | ").append(u.oldPrice)
                    .append(" | ").append(u.oldSalePrice == null ? "-" : u.oldSalePrice)
                    .append(" | ").append(u.newSalePrice)
                    .append(" | ").append(String.format(java.util.Locale.ROOT, "%.1f%%", u.discountPercent))
                    .append(" | ").append(u.variantsTouched)
                    .append(" |\n");
        }
        md.append("\n");

        try {
            Path out = Paths.get(reportPath);
            Path absolute = out.isAbsolute() ? out : out.toAbsolutePath();
            Files.write(absolute, md.toString().getBytes(StandardCharsets.UTF_8));
            log.info("Phase B datafix: wrote report to {} ({} bytes)", absolute, Files.size(absolute));
        } catch (IOException ex) {
            log.warn("Could not write sale-price-fix-report.md to {}: {}", reportPath, ex.getMessage());
        }
    }

    private static String escapeMd(String s) {
        if (s == null) return "";
        return s.replace("|", "\\|").replace("\n", " ");
    }

    public record UpdateRecord(Long productId, String name, String slug, String targetGroup,
                                BigDecimal oldPrice, BigDecimal oldSalePrice,
                                BigDecimal newSalePrice, double discountPercent,
                                int variantsTouched) { }

    public record DatafixReport(int totalUpdated, int skipped, int eligibleCount, int totalProducts, String reportPath) { }
}
