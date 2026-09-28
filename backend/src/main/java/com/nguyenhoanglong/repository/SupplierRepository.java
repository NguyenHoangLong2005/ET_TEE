package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long> {

    @Query("SELECT s FROM Supplier s WHERE :keyword IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.productType) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Supplier> searchSuppliers(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Nha cung ung ma mot SHOP_OWNER/staff duoc thay: dung chung (shop_id
     * NULL) hoac rieng cua dung chi nhanh ho (shop_id = :shopId).
     */
    @Query("SELECT s FROM Supplier s WHERE (s.shopId IS NULL OR s.shopId = :shopId) "
            + "AND (:keyword IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "OR LOWER(s.productType) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "OR LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Supplier> searchSuppliersVisibleToShop(@Param("keyword") String keyword,
                                                 @Param("shopId") Long shopId,
                                                 Pageable pageable);
}
