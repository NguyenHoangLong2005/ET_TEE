package com.nguyenhoanglong.repository;

import com.nguyenhoanglong.entity.OrderNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface OrderNoteRepository extends JpaRepository<OrderNote, Long> {
    List<OrderNote> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    /** Dem ghi chu cho nhieu don trong mot query: [orderId, count]. */
    @Query("SELECT n.order.id, COUNT(n) FROM OrderNote n WHERE n.order.id IN :orderIds GROUP BY n.order.id")
    List<Object[]> countByOrderIds(@Param("orderIds") Collection<Long> orderIds);
}
