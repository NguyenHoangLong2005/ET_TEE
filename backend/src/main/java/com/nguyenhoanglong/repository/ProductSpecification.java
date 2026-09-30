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
                        statusPredicates.add(criteriaBuilder.or(
                                criteriaBuilder.equal(root.get("isSale"), true),
                                criteriaBuilder.isNotNull(root.get("salePrice"))
                        ));
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
                    if ("boys".equalsIgnoreCase(tg)) {
                        tgPredicates.add(criteriaBuilder.and(
                                criteriaBuilder.equal(root.get("targetGroup"), "kids"),
                                criteriaBuilder.or(
                                        criteriaBuilder.equal(root.get("gender"), "boy"),
                                        criteriaBuilder.equal(root.get("gender"), "boys")
                                )
                        ));
                    } else if ("girls".equalsIgnoreCase(tg)) {
                        tgPredicates.add(criteriaBuilder.and(
                                criteriaBuilder.equal(root.get("targetGroup"), "kids"),
                                criteriaBuilder.or(
                                        criteriaBuilder.equal(root.get("gender"), "girl"),
                                        criteriaBuilder.equal(root.get("gender"), "girls")
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

                if (adultSize != null && !adultSize.trim().isEmpty()) {
                    String[] sizes = adultSize.split(",");
                    if (sizes.length == 1) {
                        predicates.add(criteriaBuilder.equal(variantsJoin.get("size"), sizes[0].trim()));
                    } else {
                        predicates.add(variantsJoin.get("size").in((Object[]) sizes));
                    }
                }
                if (kidsSize != null && !kidsSize.trim().isEmpty()) {
                    String[] sizes = kidsSize.split(",");
                    if (sizes.length == 1) {
                        predicates.add(criteriaBuilder.equal(variantsJoin.get("size"), sizes[0].trim()));
                    } else {
                        predicates.add(variantsJoin.get("size").in((Object[]) sizes));
                    }
                }
                if (accessorySize != null && !accessorySize.trim().isEmpty()) {
                    String[] sizes = accessorySize.split(",");
                    if (sizes.length == 1) {
                        predicates.add(criteriaBuilder.equal(variantsJoin.get("size"), sizes[0].trim()));
                    } else {
                        predicates.add(variantsJoin.get("size").in((Object[]) sizes));
                    }
                }
            }

            if (needsDistinct && query != null) {
                query.distinct(true);
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
