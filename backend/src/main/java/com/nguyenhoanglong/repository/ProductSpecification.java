package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Product;
import com.nguyenhoanglong.entity.ProductVariant;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ProductSpecification {

    public static Specification<Product> filter(
            String q,
            String targetGroup,
            String gender,
            String productType,
            String category,
            String collection,
            String color,
            String adultSize,
            String kidsSize,
            String accessorySize,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            String status) {

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            boolean needsDistinct = false;

            if (q != null && !q.trim().isEmpty()) {
                String cleanQ = q.trim().toLowerCase();
                String searchPattern = "%" + cleanQ + "%";
                String slugPattern = "%" + cleanQ.replaceAll("[\\s_]+", "-") + "%";

                String[] words = cleanQ.split("\\s+");
                List<Predicate> wordPredicates = new ArrayList<>();
                for (String w : words) {
                    if (!w.isEmpty()) {
                        String wordPattern = "%" + w + "%";
                        wordPredicates.add(criteriaBuilder.or(
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), wordPattern),
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), wordPattern),
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("slug")), wordPattern),
                                criteriaBuilder.like(criteriaBuilder.lower(root.get("productType")), wordPattern)
                        ));
                    }
                }

                Predicate mainMatch = criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), searchPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), searchPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("slug")), searchPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("slug")), slugPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("productType")), searchPattern)
                );

                if (!wordPredicates.isEmpty()) {
                    predicates.add(criteriaBuilder.or(
                            mainMatch,
                            criteriaBuilder.and(wordPredicates.toArray(new Predicate[0]))
                    ));
                } else {
                    predicates.add(mainMatch);
                }
            }


            // Always enforce ACTIVE status so DRAFT/HIDDEN products are not exposed
            predicates.add(criteriaBuilder.equal(root.get("status"), "ACTIVE"));

            // Filter by product catalog status badges (sale, new, best) — supports multi-select comma-separated
            if (status != null && !status.trim().isEmpty()) {
                String[] statusArray = status.split(",");
                List<Predicate> statusPredicates = new ArrayList<>();
                for (String st : statusArray) {
                    st = st.trim();
                    if ("sale".equalsIgnoreCase(st)) {
                        // salePrice equal to price is not a discount; "is not null" matched the
                        // whole catalogue (every product carried salePrice = price).
                        // Only a real discount counts; the isSale flag had drifted from the prices.
                        statusPredicates.add(criteriaBuilder.lessThan(
                                root.<java.math.BigDecimal>get("salePrice"), root.<java.math.BigDecimal>get("price")));
                    } else if ("new".equalsIgnoreCase(st)) {
                        statusPredicates.add(criteriaBuilder.equal(root.get("isNew"), true));
                    } else if ("best".equalsIgnoreCase(st) || "bestseller".equalsIgnoreCase(st)) {
                        statusPredicates.add(criteriaBuilder.equal(root.get("isBestSeller"), true));
                    }
                }
                if (!statusPredicates.isEmpty()) {
                    predicates.add(criteriaBuilder.or(statusPredicates.toArray(new Predicate[0])));
                }
            }

            // Filter by targetGroup — supports multi-select comma-separated
            if (targetGroup != null && !targetGroup.trim().isEmpty()) {
                String[] tgArray = targetGroup.split(",");
                List<Predicate> tgPredicates = new ArrayList<>();
                for (String tg : tgArray) {
                    tg = tg.trim();
                    // Unisex kids' items belong under both "Bé trai" and "Bé gái".
                    if ("boys".equalsIgnoreCase(tg)) {
                        tgPredicates.add(criteriaBuilder.and(
                                criteriaBuilder.equal(root.get("targetGroup"), "kids"),
                                criteriaBuilder.or(
                                        criteriaBuilder.equal(root.get("gender"), "boy"),
                                        criteriaBuilder.equal(root.get("gender"), "boys"),
                                        criteriaBuilder.equal(root.get("gender"), "unisex")
                                )
                        ));
                    } else if ("girls".equalsIgnoreCase(tg)) {
                        tgPredicates.add(criteriaBuilder.and(
                                criteriaBuilder.equal(root.get("targetGroup"), "kids"),
                                criteriaBuilder.or(
                                        criteriaBuilder.equal(root.get("gender"), "girl"),
                                        criteriaBuilder.equal(root.get("gender"), "girls"),
                                        criteriaBuilder.equal(root.get("gender"), "unisex")
                                )
                        ));
                    } else {
                        tgPredicates.add(criteriaBuilder.equal(root.get("targetGroup"), tg));
                    }
                }
                if (!tgPredicates.isEmpty()) {
                    predicates.add(criteriaBuilder.or(tgPredicates.toArray(new Predicate[0])));
                }
            }

            if (gender != null && !gender.trim().isEmpty()) {
                Predicate exactGender = criteriaBuilder.equal(root.get("gender"), gender.trim());
                Predicate pluralGender = criteriaBuilder.equal(root.get("gender"), gender.trim() + "s");
                predicates.add(criteriaBuilder.or(exactGender, pluralGender));
            }

            // Filter by productType — supports multi-select comma-separated
            if (productType != null && !productType.trim().isEmpty()) {
                String[] ptArray = productType.split(",");
                List<Predicate> ptPredicates = new ArrayList<>();
                for (String pt : ptArray) {
                    pt = pt.trim();
                    if ("family-set".equalsIgnoreCase(pt)) {
                        ptPredicates.add(criteriaBuilder.equal(root.get("targetGroup"), "family"));
                    } else {
                        ptPredicates.add(criteriaBuilder.equal(root.get("productType"), pt));
                    }
                }
                if (!ptPredicates.isEmpty()) {
                    predicates.add(criteriaBuilder.or(ptPredicates.toArray(new Predicate[0])));
                }
            }

            if (collection != null && !collection.isEmpty() && !"all".equalsIgnoreCase(collection)) {
                needsDistinct = true;
                Join<Object, Object> tagsJoin = root.join("styleTags", JoinType.LEFT);
                predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(tagsJoin.as(String.class)), collection.toLowerCase()));
            }

            if (category != null && !category.isEmpty()) {
                Join<Object, Object> categoryJoin = root.join("category", JoinType.LEFT);
                if ("accessories".equalsIgnoreCase(category)) {
                    predicates.add(criteriaBuilder.or(
                            criteriaBuilder.equal(categoryJoin.get("slug"), "accessories"),
                            criteriaBuilder.equal(root.get("productType"), "accessories")
                    ));
                    predicates.add(criteriaBuilder.not(root.get("productType").in(
                            "tshirt", "t-shirt", "shirt", "polo", "pants", "trousers", 
                            "jeans", "shorts", "jacket", "coat", "outerwear", "dress", "skirt", "set", "homewear"
                    )));
                } else {
                    predicates.add(criteriaBuilder.equal(categoryJoin.get("slug"), category));
                }
            }

            if (minPrice != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            // Variant filters (Color & Size) — supports multi-select comma-separated sizes
            if ((color != null && !color.isEmpty()) || 
                (adultSize != null && !adultSize.isEmpty()) || 
                (kidsSize != null && !kidsSize.isEmpty()) || 
                (accessorySize != null && !accessorySize.isEmpty())) {
                
                needsDistinct = true;
                Join<Product, ProductVariant> variantsJoin = root.join("variants", JoinType.INNER);

                if (color != null && !color.isEmpty()) {
                    predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(variantsJoin.get("color")), color.toLowerCase()));
                }

                // The three size params are just sidebar sections over the same
                // variant.size column: OR them together (ANDing them on one variant
                // row could never match), and let a letter size cover its +/- variants.
                java.util.Set<String> sizes = new java.util.LinkedHashSet<>();
                for (String param : new String[] { adultSize, kidsSize }) {
                    if (param == null) continue;
                    for (String size : param.split(",")) {
                        if (!size.isBlank()) sizes.addAll(com.nguyenhoanglong.util.SizeGroups.expandForFilter(size));
                    }
                }
                // Sock/shoe sizes only count on accessory products (waist 36 is not
                // shoe 36), and a single size also matches the sock ranges containing it
                java.util.Set<String> accessorySizes = new java.util.LinkedHashSet<>();
                if (accessorySize != null) {
                    for (String size : accessorySize.split(",")) {
                        if (!size.isBlank()) accessorySizes.addAll(com.nguyenhoanglong.util.SizeGroups.expandAccessoryForFilter(size));
                    }
                }

                // coalesce so a NULL productType/targetGroup still counts as "not accessory"
                Predicate isAccessory = criteriaBuilder.or(
                        criteriaBuilder.equal(criteriaBuilder.coalesce(root.<String>get("productType"), ""), "accessories"),
                        criteriaBuilder.equal(criteriaBuilder.coalesce(root.<String>get("targetGroup"), ""), "accessories"));
                // Plain numbers in adultSize/kidsSize are waist/height sizes, never shoe sizes
                java.util.Set<String> numericSizes = new java.util.LinkedHashSet<>();
                sizes.removeIf(size -> size.matches("\\d+") && numericSizes.add(size));

                List<Predicate> sizePredicates = new ArrayList<>();
                if (!sizes.isEmpty()) {
                    sizePredicates.add(variantsJoin.get("size").in(sizes));
                }
                if (!numericSizes.isEmpty()) {
                    sizePredicates.add(criteriaBuilder.and(
                            variantsJoin.get("size").in(numericSizes), criteriaBuilder.not(isAccessory)));
                }
                if (!accessorySizes.isEmpty()) {
                    sizePredicates.add(criteriaBuilder.and(
                            variantsJoin.get("size").in(accessorySizes), isAccessory));
                }
                if (!sizePredicates.isEmpty()) {
                    predicates.add(criteriaBuilder.or(sizePredicates.toArray(new Predicate[0])));
                }
            }

            if (needsDistinct && query != null) {
                query.distinct(true);
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
