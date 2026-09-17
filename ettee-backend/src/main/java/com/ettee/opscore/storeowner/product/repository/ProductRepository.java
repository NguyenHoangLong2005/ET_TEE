package com.ettee.opscore.storeowner.product.repository;

import com.ettee.opscore.storeowner.product.entity.Product;
import com.ettee.opscore.storeowner.product.entity.ProductStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface ProductRepository extends JpaRepository<Product, UUID> {

  @Query(value = """
      select p.*
      from ettee.products p
      where (:keyword is null or p.name ilike '%' || cast(:keyword as text) || '%')
        and (:categoryId is null or p.category_id = cast(:categoryId as uuid))
        and (:status is null or p.status::text = :status)
      order by p.updated_at desc
      """, countQuery = """
      select count(*)
      from ettee.products p
      where (:keyword is null or p.name ilike '%' || cast(:keyword as text) || '%')
        and (:categoryId is null or p.category_id = cast(:categoryId as uuid))
        and (:status is null or p.status::text = :status)
      """, nativeQuery = true)
  Page<Product> search(@Param("keyword") String keyword,
      @Param("categoryId") UUID categoryId,
      @Param("status") String status,
      Pageable pageable);

  boolean existsBySlug(String slug);
}
