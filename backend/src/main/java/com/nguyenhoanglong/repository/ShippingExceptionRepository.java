package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.ShippingException;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ShippingExceptionRepository extends JpaRepository<ShippingException, Long> {
    List<ShippingException> findAllByOrderByCreatedAtDesc();
}