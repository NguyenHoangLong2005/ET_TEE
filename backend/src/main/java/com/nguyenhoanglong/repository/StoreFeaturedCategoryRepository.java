package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.StoreFeaturedCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StoreFeaturedCategoryRepository extends JpaRepository<StoreFeaturedCategory, Long> {

    List<StoreFeaturedCategory> findByShopIdOrderByDisplayOrderAsc(Long shopId);

    void deleteByShopId(Long shopId);
}
