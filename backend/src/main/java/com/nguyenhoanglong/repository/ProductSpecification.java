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
            BigDecimal maxPrice) {

        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Avoid duplicate rows when joining variants
            query.distinct(true);

            if (q != null && !q.trim().isEmpty()) {
                String searchPattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(criteriaBuilder.or(
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("name")), searchPattern),
                        criteriaBuilder.like(criteriaBuilder.lower(root.get("description")), searchPattern)
                ));
            }

            // Always enforce ACTIVE status so DRAFT/HIDDEN products are not exposed,
            // unless a specific status was requested (which we'll override if it's not active contextually)
            predicates.add(criteriaBuilder.equal(root.get("status"), "ACTIVE"));


            if (targetGroup != null && !targetGroup.isEmpty()) {
                // UI sidebar uses "boys"/"girls" for kids sub-segments. The DB
                // stores everything under targetGroup="kids" plus a gender field.
                if ("boys".equalsIgnoreCase(targetGroup)) {
                    predicates.add(criteriaBuilder.equal(root.get("targetGroup"), "kids"));
                    predicates.add(criteriaBuilder.or(
                            criteriaBuilder.equal(root.get("gender"), "boy"),
                            criteriaBuilder.equal(root.get("gender"), "boys")
                    ));
                } else if ("girls".equalsIgnoreCase(targetGroup)) {
                    predicates.add(criteriaBuilder.equal(root.get("targetGroup"), "kids"));
                    predicates.add(criteriaBuilder.or(
                            criteriaBuilder.equal(root.get("gender"), "girl"),
                            criteriaBuilder.equal(root.get("gender"), "girls")
                    ));
                } else {
                    predicates.add(criteriaBuilder.equal(root.get("targetGroup"), targetGroup));
                }
            }

            if (gender != null && !gender.isEmpty()) {
                // For kids, if gender is provided, match that gender or "unisex" if we had one.
                // The requirements say:
                // Nếu targetGroup=kids&gender=boy -> chỉ trả sản phẩm kids có gender = boy hoặc boys.
                // Nếu targetGroup=kids&gender=girl -> chỉ trả sản phẩm kids có gender = girl hoặc girls.
                Predicate exactGender = criteriaBuilder.equal(root.get("gender"), gender);
                Predicate pluralGender = criteriaBuilder.equal(root.get("gender"), gender + "s");
                
                // If gender is unisex in DB, maybe we show it? The requirement says:
                // Nếu gender null/unisex thì chỉ hiện ở Bé trai/Bé gái nếu product thật sự unisex và muốn hiển thị cả hai. Nếu chưa chắc, tạm không đưa vào boy/girl riêng.
                // So we will just filter by exact gender or plural gender.
                predicates.add(criteriaBuilder.or(exactGender, pluralGender));
            }

            if (productType != null && !productType.isEmpty()) {
                // Sidebar "Family Set" maps to targetGroup=family rather than a
                // literal productType (the catalog has no productType="family-set").
                if ("family-set".equalsIgnoreCase(productType)) {
                    predicates.add(criteriaBuilder.equal(root.get("targetGroup"), "family"));
                } else {
                    predicates.add(criteriaBuilder.equal(root.get("productType"), productType));
                }
            }

            if (collection != null && !collection.isEmpty() && !"all".equalsIgnoreCase(collection)) {
                Join<Object, Object> tagsJoin = root.join("styleTags", JoinType.LEFT);
                predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(tagsJoin.as(String.class)), collection.toLowerCase()));
            }

            if (category != null && !category.isEmpty()) {
                Join<Object, Object> categoryJoin = root.join("category", JoinType.LEFT);
                predicates.add(criteriaBuilder.equal(categoryJoin.get("slug"), category));
            }

            if (minPrice != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("price"), minPrice));
            }
            if (maxPrice != null) {
                predicates.add(criteriaBuilder.lessThanOrEqualTo(root.get("price"), maxPrice));
            }

            // Variant filters (Color & Size)
            if ((color != null && !color.isEmpty()) || 
                (adultSize != null && !adultSize.isEmpty()) || 
                (kidsSize != null && !kidsSize.isEmpty()) || 
                (accessorySize != null && !accessorySize.isEmpty())) {
                
                Join<Product, ProductVariant> variantsJoin = root.join("variants", JoinType.INNER);

                if (color != null && !color.isEmpty()) {
                    predicates.add(criteriaBuilder.equal(criteriaBuilder.lower(variantsJoin.get("color")), color.toLowerCase()));
                }

                if (adultSize != null && !adultSize.isEmpty()) {
                    predicates.add(criteriaBuilder.equal(variantsJoin.get("size"), adultSize));
                } else if (kidsSize != null && !kidsSize.isEmpty()) {
                    predicates.add(criteriaBuilder.equal(variantsJoin.get("size"), kidsSize));
                } else if (accessorySize != null && !accessorySize.isEmpty()) {
                    predicates.add(criteriaBuilder.equal(variantsJoin.get("size"), accessorySize));
                }
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}
