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

    // keyword must be "" (not null) for "no filter": see ManufacturerRepository.
    @Query("SELECT s FROM Supplier s WHERE :keyword = '' OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.productType) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    Page<Supplier> searchSuppliers(@Param("keyword") String keyword, Pageable pageable);

    // Derived queries: a null shopId becomes "shop_id IS NULL" (shared suppliers), never a null bind param.
    boolean existsByNameIgnoreCaseAndShopId(String name, Long shopId);

    boolean existsByNameIgnoreCaseAndShopIdAndIdNot(String name, Long shopId, Long id);

    /**
     * Nha cung ung ma mot SHOP_OWNER/staff duoc thay: dung chung (shop_id
     * NULL) hoac rieng cua dung chi nhanh ho (shop_id = :shopId).
     */
    @Query("SELECT s FROM Supplier s WHERE (s.shopId IS NULL OR s.shopId = :shopId) "
            + "AND (:keyword = '' OR LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "OR LOWER(s.productType) LIKE LOWER(CONCAT('%', :keyword, '%')) "
            + "OR LOWER(s.email) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Supplier> searchSuppliersVisibleToShop(@Param("keyword") String keyword,
                                                 @Param("shopId") Long shopId,
                                                 Pageable pageable);
}
