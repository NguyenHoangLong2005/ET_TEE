package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.OrderNote;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderNoteRepository extends JpaRepository<OrderNote, Long> {
    List<OrderNote> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
