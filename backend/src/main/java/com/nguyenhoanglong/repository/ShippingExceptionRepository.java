package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ShippingException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ShippingExceptionRepository extends JpaRepository<ShippingException, Long> {
    List<ShippingException> findAllByOrderByCreatedAtDesc();
}
