package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.OrderNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OrderNoteRepository extends JpaRepository<OrderNote, Long> {
    List<OrderNote> findByOrderIdOrderByCreatedAtDesc(Long orderId);
}
