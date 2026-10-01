package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductVariantRepository extends JpaRepository<ProductVariant, Long> {
    Optional<ProductVariant> findBySku(String sku);
    boolean existsBySku(String sku);
    List<ProductVariant> findByProductId(Long productId);

    // Listing pages only need the distinct colors/sizes per product. Loading every variant
    // (~30 per product, ~100 KB per page) over the remote DB link costs seconds, while
    // these grouped projections return a few rows per product.
    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT v.product.id, v.color, v.colorHex, v.colorCode FROM ProductVariant v " +
            "WHERE v.product.id IN :ids AND v.colorHex IS NOT NULL")
    List<Object[]> findDistinctColorsByProductIds(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids);

    @org.springframework.data.jpa.repository.Query(
            "SELECT DISTINCT v.product.id, v.size FROM ProductVariant v " +
            "WHERE v.product.id IN :ids AND v.size IS NOT NULL")
    List<Object[]> findDistinctSizesByProductIds(@org.springframework.data.repository.query.Param("ids") java.util.Collection<Long> ids);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT pv FROM ProductVariant pv WHERE pv.id = :id")
    Optional<ProductVariant> findByIdWithPessimisticLock(@org.springframework.data.repository.query.Param("id") Long id);
}
